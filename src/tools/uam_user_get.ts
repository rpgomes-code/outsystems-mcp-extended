import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerUamUserGet(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "uam_user_get",
    {
      title: "Get user details",
      description:
        "Retrieve full details for a single user. Wraps GET /api/identity/v1/users/{key}. Returns name, email, status, last login, photo, etc.",
      inputSchema: {
        key: z.string().uuid(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "identity",
          `/users/${encodeURIComponent(args.key)}`
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        if (err instanceof HttpError) {
          return { content: [{ type: "text", text: `Request failed: ${err.message}` }], isError: true };
        }
        throw err;
      }
    }
  );
}
