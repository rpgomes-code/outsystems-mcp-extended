import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerAssetRevisionGet(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "asset_revision_get",
    {
      title: "Get asset revision details",
      description:
        "Retrieve details for a specific revision of an asset. Wraps GET /api/asset-repository/v1/assets/{assetKey}/revisions/{revisionNumber}.",
      inputSchema: {
        assetKey: z.string().uuid(),
        revisionNumber: z.number().int().positive(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "asset-repository",
          `/assets/${encodeURIComponent(args.assetKey)}/revisions/${args.revisionNumber}`
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
