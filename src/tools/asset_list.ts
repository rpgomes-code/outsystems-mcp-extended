import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

const ASSET_TYPES = [
  "WebApplication",
  "MobileApplication",
  "LowCodeLibrary",
  "ExtensionLibrary",
  "ExternalConnection",
  "ExternalLibrary",
  "Workflow",
  "WidgetLibrary",
  "AIModelConnection",
  "SearchServiceConnection",
  "Agent",
  "MCPConnection",
] as const;

export function registerAssetList(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "asset_list",
    {
      title: "List assets",
      description:
        "List assets in the asset repository — the canonical 'what assets exist in my org' query. Returns the latest revision of each. Wraps GET /api/asset-repository/v1/assets. Filterable by name, asset type, external/internal. Default page size 100, max 1000.",
      inputSchema: {
        nameContains: z
          .string()
          .optional()
          .describe(
            "Filter assets by name (case-insensitive substring match)"
          ),
        assetTypes: z
          .array(z.enum(ASSET_TYPES))
          .optional()
          .describe(
            "Filter by one or more asset types (WebApplication, ExtensionLibrary, Agent, MCPConnection, etc.)"
          ),
        isExternal: z
          .boolean()
          .optional()
          .describe(
            "Filter by whether the asset is external (e.g. from Forge)"
          ),
        sort: z
          .string()
          .optional()
          .describe(
            "Sort key. Allowed: name, createdAt. Prepend '-' for descending (e.g. '-createdAt')."
          ),
        limit: z
          .number()
          .int()
          .positive()
          .max(1000)
          .optional()
          .describe("Max results per page (default 100, max 1000)"),
        offset: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Pagination offset (default 0)"),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "asset-repository",
          "/assets",
          {
            nameContains: args.nameContains,
            assetTypes: args.assetTypes,
            isExternal: args.isExternal,
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
