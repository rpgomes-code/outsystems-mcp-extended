import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerAssetGet(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "asset_get",
    {
      title: "Get asset details",
      description:
        "Retrieve full details for a single asset by key. Wraps GET /api/asset-repository/v1/assets/{assetKey}. More detail than asset_list rows.",
      inputSchema: {
        assetKey: z.string().uuid(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "asset-repository",
          `/assets/${encodeURIComponent(args.assetKey)}`
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
