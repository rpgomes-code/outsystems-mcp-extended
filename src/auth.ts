// ─────────────────────────────────────────────────────────────────────────────
// JWT decoder — diagnostic only.
//
// This helper splits a JWT into its header + payload claims so the
// `auth_status` tool can surface things like issuer, expiry, and tenant
// identifier without making a network call.
//
// IMPORTANT: This is NOT a signature-verifying decoder. We do not check the
// JWT's signature against the issuer's public key. That's deliberate:
//
//   - The bearer token landed in this process through one of two trusted
//     channels: an explicit env var supplied by the operator, or the OAuth
//     flow we drive against the tenant's own IdP. Either way, the tenant has
//     already authenticated the principal.
//   - The decoded payload is used only for human-readable status output, not
//     for any access-control decision. Authorisation happens server-side on
//     each REST call.
//
// If you ever want to use the claims here for policy enforcement, swap this
// for a real JOSE library (`jose`, `node-jose`) and verify against the
// tenant's JWKS first.
// ─────────────────────────────────────────────────────────────────────────────

export interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

/**
 * Decode a JWT into its header + payload object. Throws if the token isn't a
 * well-formed JWT (3 dot-separated base64url segments — we accept 2 because
 * unsigned JWTs are technically valid even though we don't expect them here).
 */
export function decodeJwt(token: string): JwtParts {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid JWT format: expected at least 2 segments");
  }
  return {
    header: JSON.parse(base64UrlDecode(parts[0])),
    payload: JSON.parse(base64UrlDecode(parts[1])),
  };
}

/**
 * base64url → utf-8 string. The standard `Buffer.from(x, "base64")` accepts
 * the padded base64 alphabet; JWT uses base64url (no padding, `-`/`_` instead
 * of `+`/`/`). Pad and translate before decoding.
 */
function base64UrlDecode(input: string): string {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}
