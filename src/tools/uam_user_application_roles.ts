import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerUamUserApplicationRoles(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "uam_user_application_roles",
    {
      title: "List a user's application roles",
      description:
        "List all application roles assigned to a specific user. Wraps GET /api/identity/v1/users/{key}/application-roles. Use to answer 'what can this user do across apps?'",
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
          `/users/${encodeURIComponent(key)}/application-roles`,
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
