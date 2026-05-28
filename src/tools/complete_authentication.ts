import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import type { PendingAuthStore } from "../pending-auth-store.js";
import { exchangeCodeForToken } from "../oauth.js";

export function registerCompleteAuthentication(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore,
  pendingAuthStore: PendingAuthStore
): void {
  server.registerTool(
    "complete_authentication",
    {
      title: "Finalize OAuth (remote sessions)",
      description:
        "Finalizes OAuth when the local callback listener cannot be reached from the browser host (SSH session, remote devcontainer, etc.). Pass the full URL the user copied from their browser's address bar after authorizing — must include `?code=...&state=...`. Validates state, exchanges the code for a bearer token (and refresh token), stores them in memory.",
      inputSchema: {
        callback_url: z
          .string()
          .url()
          .describe(
            "The full URL the user pasted from their browser after authorizing — must include ?code=...&state=..."
          ),
      },
    },
    async ({ callback_url }) => {
      const pending = pendingAuthStore.get();
      if (!pending) {
        return {
          content: [
            {
              type: "text",
              text: "No pending auth flow. Call `authenticate` first to start one.",
            },
          ],
          isError: true,
        };
      }

      let parsed: URL;
      try {
        parsed = new URL(callback_url);
      } catch {
        return {
          content: [{ type: "text", text: "Invalid callback URL." }],
          isError: true,
        };
      }

      const code = parsed.searchParams.get("code");
      const state = parsed.searchParams.get("state");
      const error = parsed.searchParams.get("error");
      const errorDescription = parsed.searchParams.get("error_description");

      if (error) {
        return {
          content: [
            {
              type: "text",
              text: `OAuth error from authorization server: ${error}${
                errorDescription ? ` — ${errorDescription}` : ""
              }`,
            },
          ],
          isError: true,
        };
      }
      if (!code || !state) {
        return {
          content: [
            {
              type: "text",
              text: "Callback URL missing `code` or `state` parameter.",
            },
          ],
          isError: true,
        };
      }
      if (state !== pending.state) {
        return {
          content: [
            {
              type: "text",
              text: "State mismatch — possible CSRF or stale pending auth. Call `authenticate` again to start a fresh flow.",
            },
          ],
          isError: true,
        };
      }

      try {
        const tokens = await exchangeCodeForToken(config, code, pending);
        tokenStore.setFromTokenResponse(tokens);
        pendingAuthStore.clear();
        const refreshNote = tokens.refresh_token
          ? " Silent refresh enabled (refresh token captured)."
          : " No refresh token returned — re-`authenticate` when this access token expires.";
        const expiresIn = tokens.expires_in
          ? ` Token expires in ~${tokens.expires_in}s.`
          : "";
        return {
          content: [
            {
              type: "text",
              text: `Authentication complete. Token stored in memory.${expiresIn}${refreshNote}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Token exchange failed: ${
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
