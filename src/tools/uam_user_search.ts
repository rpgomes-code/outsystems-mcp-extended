import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerUamUserSearch(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "uam_user_search",
    {
      title: "Search users",
      description:
        "Search tenant users by name, email, or other filters. Wraps GET /api/identity/v1/users. Use to resolve user identities for impact analysis, audit, or onboarding workflows. Returns up to 100 users per page.",
      inputSchema: {
        nameOrEmailContains: z
          .string()
          .optional()
          .describe(
            "Filter users by name or email (case-insensitive substring)"
          ),
        nameOrEmailOrUsernameContains: z
          .string()
          .optional()
          .describe(
            "Filter users by name, email, or username (case-insensitive substring)"
          ),
        userKeys: z
          .string()
          .optional()
          .describe(
            "Comma-separated list of user UUIDs to fetch (resolves keys → details)"
          ),
        assetKey: z
          .string()
          .uuid()
          .optional()
          .describe("Only return users that have roles on this asset"),
        environmentKey: z
          .string()
          .uuid()
          .optional()
          .describe("Only return users that have roles in this environment"),
        hasOrganizationRoles: z
          .boolean()
          .optional()
          .describe(
            "If true, only users with at least one organization role"
          ),
        hasApplicationRoles: z
          .boolean()
          .optional()
          .describe("If true, only users with at least one application role"),
        sort: z
          .string()
          .optional()
          .describe("Sort key; prepend '-' for descending"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Max results per page (1-100, default 100)"),
        offset: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>("identity", "/users", {
          nameOrEmailContains: args.nameOrEmailContains,
          nameOrEmailOrUsernameContains: args.nameOrEmailOrUsernameContains,
          userKeys: args.userKeys,
          assetKey: args.assetKey,
          environmentKey: args.environmentKey,
          hasOrganizationRoles: args.hasOrganizationRoles,
          hasApplicationRoles: args.hasApplicationRoles,
          sort: args.sort,
          limit: args.limit,
          offset: args.offset,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        if (err instanceof HttpError) {
          return {
            content: [{ type: "text", text: `Request failed: ${err.message}` }],
            isError: true,
          };
        }
        throw err;
      }
    }
  );
}
