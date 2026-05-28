// ─────────────────────────────────────────────────────────────────────────────
// In-memory token storage.
//
// Single source of truth for the bearer JWT the REST client puts in every
// `Authorization` header. There is one instance per server process — created
// in `server.ts` and threaded through every `register*` tool registration.
//
// No persistence: clearing the store happens implicitly when the process
// exits. That's deliberate — long-lived tokens on disk are an attack-surface
// liability, and the OAuth flow can always be re-driven from the IDE.
//
// The store can be populated through two paths:
//
//   1. `setFromTokenResponse` — used by the OAuth flow. Captures the access
//      token, the refresh token (if returned), and the expiry. Some IdPs
//      rotate refresh tokens on every grant; we update both fields on each
//      successful response so a refresh-on-401 retry keeps working.
//
//   2. `setFromAccessToken` — used at startup when OS_BEARER_TOKEN is set.
//      No refresh token in this path — the operator is on the hook for
//      keeping the token fresh (typically irrelevant for short CI jobs).
//
// Expiry tracking is best-effort: we prefer the JWT's `exp` claim, fall back
// to the OAuth `expires_in` count, and treat anything we can't decode as
// "unknown expiry" rather than failing.
// ─────────────────────────────────────────────────────────────────────────────

import { decodeJwt } from "./auth.js";
import type { TokenResponse } from "./oauth.js";

export class TokenStore {
  private bearer: string | null = null;
  private refreshToken: string | null = null;
  /** Unix seconds (matching the JWT `exp` claim convention), or null. */
  private exp: number | null = null;

  /**
   * Populate from a full RFC 6749 token response. Used after both the initial
   * code-exchange and any refresh-token grant. Refresh-token rotation is
   * handled implicitly — if the new response carries a fresh refresh_token
   * we'll overwrite the previous one.
   */
  setFromTokenResponse(tokens: TokenResponse): void {
    this.bearer = tokens.access_token;
    if (tokens.refresh_token) {
      this.refreshToken = tokens.refresh_token;
    }

    // Prefer the JWT's `exp` claim because it's signed by the IdP. Fall back
    // to `expires_in` (seconds from now) only if the JWT can't be decoded.
    let parsedExp: number | null = null;
    try {
      const { payload } = decodeJwt(tokens.access_token);
      if (typeof payload.exp === "number") parsedExp = payload.exp;
    } catch {
      // JWT decode failed — leave parsedExp null and fall through.
    }
    if (parsedExp === null && tokens.expires_in) {
      parsedExp = Math.floor(Date.now() / 1000) + tokens.expires_in;
    }
    this.exp = parsedExp;
  }

  /**
   * Populate from a bare access token (env-var seeding path). No refresh
   * token is available here, so refresh-on-401 in the REST client won't kick
   * in — once this token expires the operator has to supply a new one.
   */
  setFromAccessToken(accessToken: string): void {
    this.bearer = accessToken;
    this.refreshToken = null;
    try {
      const { payload } = decodeJwt(accessToken);
      this.exp = typeof payload.exp === "number" ? payload.exp : null;
    } catch {
      this.exp = null;
    }
  }

  /** Current access token, or null if we don't have one. */
  get(): string | null {
    return this.bearer;
  }

  /** Current refresh token, or null. */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /** Quick predicate so callers can branch without leaking the token itself. */
  hasRefreshToken(): boolean {
    return this.refreshToken !== null;
  }

  /** Unix-seconds expiry, or null if unknown. */
  expiresAt(): number | null {
    return this.exp;
  }

  /**
   * True iff we know an expiry AND it's in the past. Returns false when the
   * expiry is unknown — we'd rather try a request and react to a real 401
   * than reject preemptively on speculation.
   */
  isExpired(): boolean {
    return this.exp !== null && Date.now() / 1000 >= this.exp;
  }

  /** Wipe all credential state. */
  clear(): void {
    this.bearer = null;
    this.refreshToken = null;
    this.exp = null;
  }
}
