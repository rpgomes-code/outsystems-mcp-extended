import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { decodeJwt } from "../auth.js";

export function registerAuthStatus(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  server.registerTool(
    "auth_status",
    {
      title: "Authentication status",
      description:
        "Show the current OutSystems authentication status. Returns tenant ID, user ID, OAuth client, issuer (Keycloak realm), scope, expiry, and whether a refresh token is available for silent re-auth. If no token is currently stored, indicates that and points to the `authenticate` tool.",
      inputSchema: {},
    },
    async () => {
      const token = tokenStore.get();
      if (!token) {
        const summary = {
          logged_in: false,
          tenant_hostname: config.tenant,
          note: "No bearer token stored. Call `authenticate` to start the OAuth flow, or set OS_BEARER_TOKEN env var at startup.",
        };
        return {
          content: [
            { type: "text", text: JSON.stringify(summary, null, 2) },
          ],
        };
      }

      try {
        const { payload } = decodeJwt(token);
        const now = Math.floor(Date.now() / 1000);
        const exp = typeof payload.exp === "number" ? payload.exp : null;
        const expiresIn = exp !== null ? exp - now : null;

        const summary = {
          logged_in: expiresIn !== null && expiresIn > 0,
          has_refresh_token: tokenStore.hasRefreshToken(),
          tenant_id: payload.tid ?? null,
          user_id: payload.sub ?? payload.uid ?? null,
          client: payload.azp ?? null,
          issuer: payload.iss ?? null,
          scope: payload.scope ?? null,
          expires_in_seconds: expiresIn,
          expires_in_human:
            expiresIn !== null ? humanizeSeconds(expiresIn) : null,
          tenant_hostname: config.tenant,
          claims: payload,
        };

        return {
          content: [
            { type: "text", text: JSON.stringify(summary, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to decode bearer token: ${
                err instanceof Error ? err.message : String(err)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function humanizeSeconds(s: number): string {
  if (s <= 0) return "expired";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
