import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerAssetRevisionsList(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "asset_revisions_list",
    {
      title: "List asset revisions",
      description:
        "List the full revision history of an asset. Wraps GET /api/asset-repository/v1/assets/{assetKey}/revisions.",
      inputSchema: {
        assetKey: z.string().uuid(),
        limit: z.number().int().positive().max(1000).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async (args) => {
      const { assetKey, ...query } = args;
      try {
        const data = await client.get<unknown>(
          "asset-repository",
          `/assets/${encodeURIComponent(assetKey)}/revisions`,
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
