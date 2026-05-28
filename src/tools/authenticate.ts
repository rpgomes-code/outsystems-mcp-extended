import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import type { PendingAuthStore } from "../pending-auth-store.js";
import {
  generatePkce,
  exchangeCodeForToken,
  CALLBACK_PORT,
} from "../oauth.js";
import { listenForCallback } from "../callback-server.js";

export function registerAuthenticate(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore,
  pendingAuthStore: PendingAuthStore
): void {
  server.registerTool(
    "authenticate",
    {
      title: "Start OAuth flow",
      description:
        "Initiates OAuth/PKCE authentication against the configured tenant and returns an authorize URL the user opens in their browser. On callback the bearer token (and refresh token) are captured automatically and stored in memory for all subsequent REST calls. Subsequent 401s trigger silent refresh-token exchange. For remote sessions where the localhost callback cannot be reached (SSH, devcontainer), the user should copy the full URL from their browser's address bar after authorizing and call `complete_authentication` with it.",
      inputSchema: {},
    },
    async () => {
      const pending = generatePkce(config);

      let handle;
      try {
        handle = listenForCallback(CALLBACK_PORT);
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to start local callback listener on port ${CALLBACK_PORT}: ${
                err instanceof Error ? err.message : String(err)
              }\n\nYou can still authenticate via complete_authentication — open the URL below and after authorizing, copy the full callback URL from your browser and pass it to complete_authentication.`,
            },
          ],
          isError: false,
        };
      }

      pendingAuthStore.set(pending, () => handle.cancel());

      // Fire-and-forget — the listener resolves later (or times out)
      handle.promise
        .then(async (result) => {
          if (result.error) {
            console.error(
              `[authenticate] OAuth error from callback: ${result.error}${
                result.errorDescription ? ` (${result.errorDescription})` : ""
              }`
            );
            return;
          }
          if (!result.code) {
            console.error("[authenticate] Callback missing code");
            return;
          }
          if (result.state !== pending.state) {
            console.error(
              "[authenticate] State mismatch — possible CSRF or stale pending auth; discarding"
            );
            return;
          }
          try {
            const tokens = await exchangeCodeForToken(
              config,
              result.code,
              pending
            );
            tokenStore.setFromTokenResponse(tokens);
            pendingAuthStore.clear();
            const refreshNote = tokens.refresh_token
              ? " (with refresh token — silent refresh enabled)"
              : "";
            console.error(
              `[authenticate] Token received via local callback${refreshNote} — REST tools now usable`
            );
          } catch (err) {
            console.error("[authenticate] Token exchange failed:", err);
          }
        })
        .catch((err: Error) => {
          // Timeout or cancellation — not necessarily an error from the user's POV
          console.error(
            `[authenticate] Callback listener ended: ${err.message}`
          );
        });

      return {
        content: [
          {
            type: "text",
            text:
              `Ask the user to open this URL in their browser to authorize the outsystems-mcp-extended server:\n\n` +
              `${pending.authorizeUrl}\n\n` +
              `Once they authorize, the token (and refresh token) will be captured automatically by the local callback listener on port ${CALLBACK_PORT}. Subsequent 401s on REST calls will trigger silent refresh.\n\n` +
              `If the browser shows a connection error on the redirect page (e.g. SSH / remote dev container where localhost is unreachable from the browser host), ask the user to copy the full URL from the address bar and call \`complete_authentication\` with it.`,
          },
        ],
      };
    }
  );
}
