import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerUamApplicationRoleList(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "uam_application_role_list",
    {
      title: "List application roles",
      description:
        "List application-level roles defined across the tenant. Wraps GET /api/identity/v1/application-roles. Use to understand role-based access for impact analysis ('who can hit role-protected screens?').",
      inputSchema: {
        key: z
          .string()
          .uuid()
          .optional()
          .describe("Filter by a specific application-role key"),
        assetKey: z
          .string()
          .uuid()
          .optional()
          .describe("Filter roles belonging to a specific asset"),
        environmentKey: z
          .string()
          .uuid()
          .optional()
          .describe("Filter roles by environment (stage)"),
        nameContains: z
          .string()
          .optional()
          .describe("Filter by role name (case-insensitive substring)"),
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
        const data = await client.get<unknown>(
          "identity",
          "/application-roles",
          {
            key: args.key,
            assetKey: args.assetKey,
            environmentKey: args.environmentKey,
            nameContains: args.nameContains,
            sort: args.sort,
            limit: args.limit,
            offset: args.offset,
          }
        );
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
