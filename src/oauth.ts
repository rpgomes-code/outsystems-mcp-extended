// ─────────────────────────────────────────────────────────────────────────────
// OAuth 2.0 + PKCE driver for the tenant's MCP authorization server.
//
// Endpoint layout (hardcoded — same paths the official MCP and ServiceStudio
// use, confirmed against every ODC tenant we've tested):
//
//   - Authorize: https://<tenant>/mcp/authorize
//   - Token:     https://<tenant>/mcp/token
//
// If a tenant ever ships a non-standard layout the right escape hatch is RFC
// 8414 discovery via `/mcp/.well-known/oauth-authorization-server`. We don't
// implement that today because no tenant in the wild needs it.
//
// PKCE (RFC 7636) is the recommended flow for native / desktop clients — the
// code_verifier is generated locally, only the SHA-256 challenge crosses the
// wire to the authorize endpoint, and the verifier is presented at the token
// endpoint as proof we're the same client that started the flow. No client
// secret required.
// ─────────────────────────────────────────────────────────────────────────────

import { randomBytes, createHash } from "node:crypto";
import type { Config } from "./config.js";

/**
 * Port for the local OAuth callback listener. Deliberately != 7890 (the port
 * the official MCP uses) so both servers can run side-by-side without
 * fighting over the loopback socket.
 */
export const CALLBACK_PORT = 7891;

/**
 * OAuth client_id. Identical to ServiceStudio's so the tenant treats us as a
 * known client. No secret — PKCE replaces it.
 */
export const CLIENT_ID = "service_studio";

/** All the per-attempt state we need to remember between authorize → token. */
export interface PendingAuth {
  /** PKCE code_verifier, kept secret until token exchange. */
  verifier: string;
  /** Random state value echoed back by the callback for CSRF protection. */
  state: string;
  /** The exact redirect_uri sent to authorize — must match at token exchange. */
  redirectUri: string;
  /** Full authorize URL the user opens in their browser. */
  authorizeUrl: string;
  /** RFC 8707 audience hint — the API resource the token is being issued for. */
  resource: string;
}

/** Subset of the RFC 6749 token response we care about. */
export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Build a fresh authorize URL + the matching PKCE secret. Call this once per
 * `authenticate` invocation — never reuse a verifier across attempts.
 */
export function generatePkce(config: Config): PendingAuth {
  // RFC 7636 §4.1: verifier is 43–128 chars of base64url. 32 random bytes →
  // 43 chars (no padding), comfortably above the security floor.
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(
    createHash("sha256").update(verifier).digest()
  );

  // Anti-CSRF nonce. Echoed back in the callback querystring so we can detect
  // a stale or forged redirect.
  const state = base64UrlEncode(randomBytes(16));

  const redirectUri = `http://localhost:${CALLBACK_PORT}/callback`;
  const resource = `https://${config.tenant}/mcp`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: redirectUri,
    state,
    resource,
  });

  const authorizeUrl = `https://${config.tenant}/mcp/authorize?${params.toString()}`;
  return { verifier, state, redirectUri, authorizeUrl, resource };
}

/**
 * RFC 6749 §4.1.3 — exchange the authorization code from the callback for an
 * access token (and usually a refresh token). Sends the same redirect_uri and
 * the original PKCE verifier; both must match what was used at authorize.
 */
export async function exchangeCodeForToken(
  config: Config,
  code: string,
  pending: PendingAuth
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: pending.redirectUri,
    client_id: CLIENT_ID,
    code_verifier: pending.verifier,
    resource: pending.resource,
  });

  return postToTokenEndpoint(config, body, "Token exchange");
}

/**
 * RFC 6749 §6 — exchange a refresh_token for a fresh access_token. Used by
 * `client.ts` on 401 responses so an expired access token doesn't force the
 * user back through the browser flow. Some authorization servers rotate
 * refresh tokens; the new value is captured by TokenStore if present.
 */
export async function refreshAccessToken(
  config: Config,
  refreshToken: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });

  return postToTokenEndpoint(config, body, "Refresh");
}

/**
 * Shared POST → /mcp/token implementation. Both the initial code exchange and
 * refresh-token grants use the same endpoint with `application/x-www-form-urlencoded`.
 * We deliberately surface a truncated error body on failure so callers can see
 * what the IdP complained about without dumping potentially huge HTML pages
 * into logs.
 */
async function postToTokenEndpoint(
  config: Config,
  body: URLSearchParams,
  opName: string
): Promise<TokenResponse> {
  const tokenUrl = `https://${config.tenant}/mcp/token`;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `${opName} failed: HTTP ${res.status} ${res.statusText} — ${errBody.slice(0, 400)}`
    );
  }

  return (await res.json()) as TokenResponse;
}

/** Buffer → base64url string (RFC 4648 §5, no padding). */
function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
