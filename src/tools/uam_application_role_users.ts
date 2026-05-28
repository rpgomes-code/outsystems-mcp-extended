import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerUamApplicationRoleUsers(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "uam_application_role_users",
    {
      title: "List users with an application role",
      description:
        "List all users who have a given application role. Wraps GET /api/identity/v1/application-roles/{key}/users. Use to answer 'who has access to this app screen?'",
      inputSchema: {
        key: z.string().uuid(),
        limit: z.number().int().positive().max(100).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async (args) => {
      const { key, ...query } = args;
      try {
        const data = await client.get<unknown>(
          "identity",
          `/application-roles/${encodeURIComponent(key)}/users`,
          query
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
