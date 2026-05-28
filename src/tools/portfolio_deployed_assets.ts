import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

const DEPLOYED_ASSET_TYPES = [
  "WebApplication",
  "MobileApplication",
  "Workflow",
  "Agent",
] as const;

export function registerPortfolioDeployedAssets(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "portfolio_deployed_assets",
    {
      title: "Deployed assets across environments",
      description:
        "Cross-environment inventory of deployed assets — the canonical 'what's in production?' query. For each asset, returns deployment status per environment (stage). Wraps GET /api/portfolios/v1/deployed-assets. Only shows assets in environments the caller has 'Stage > View stage' permission for.",
      inputSchema: {
        environmentKey: z
          .string()
          .optional()
          .describe(
            "Filter by environment key. Comma-separated for multiple environments."
          ),
        key: z
          .string()
          .optional()
          .describe(
            "Filter by asset keys. Comma-separated for multiple assets."
          ),
        type: z
          .array(z.enum(DEPLOYED_ASSET_TYPES))
          .optional()
          .describe(
            "Filter by asset type (WebApplication, MobileApplication, Workflow, Agent)"
          ),
        nameContains: z
          .string()
          .optional()
          .describe(
            "Filter by name (case-insensitive substring match)"
          ),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Max results per page"),
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
          "portfolios",
          "/deployed-assets",
          {
            environmentKey: args.environmentKey,
            key: args.key,
            type: args.type,
            nameContains: args.nameContains,
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
