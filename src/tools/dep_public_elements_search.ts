import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerDepPublicElementsSearch(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "dep_public_elements_search",
    {
      title: "Search public elements",
      description:
        "Search for public elements (entities, actions, structures) across the tenant by name, description, or type. Wraps POST /api/dependency-management/v1/public-elements/search. Use to answer 'which app exposes <name>?' or to find duplicate exposed elements.",
      inputSchema: {
        elementNameContains: z
          .string()
          .optional()
          .describe("Filter elements where the name contains the keyword"),
        elementNameOrDescriptionContains: z
          .string()
          .optional()
          .describe(
            "Filter elements where the name OR description contains the keyword"
          ),
        elementType: z
          .string()
          .optional()
          .describe(
            "Filter by element type (Entity, ServerAction, ClientAction, Structure, etc.)"
          ),
        includeHidden: z
          .boolean()
          .optional()
          .describe("Whether to include hidden elements (default false)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(500)
          .optional()
          .describe("Max elements returned"),
        offset: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Pagination offset"),
        sort: z
          .string()
          .optional()
          .describe("Sort by field"),
        sortAscending: z
          .boolean()
          .optional()
          .describe("True for ascending, false for descending"),
      },
    },
    async (args) => {
      try {
        const data = await client.post<unknown>(
          "dependency-management",
          "/public-elements/search",
          {
            elementNameContains: args.elementNameContains,
            elementNameOrDescriptionContains: args.elementNameOrDescriptionContains,
            elementType: args.elementType,
            includeHidden: args.includeHidden,
            limit: args.limit,
            offset: args.offset,
            sort: args.sort,
            sortAscending: args.sortAscending,
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
