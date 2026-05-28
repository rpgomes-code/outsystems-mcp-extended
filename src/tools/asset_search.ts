import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerAssetSearch(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "asset_search",
    {
      title: "Bulk asset search",
      description:
        "Bulk-resolve asset revisions by key+revision filters, optionally embedding release notes, icon, source-code refs, signature, metadata. Wraps POST /api/asset-repository/v1/assets/search. Use to resolve many asset keys in one call.",
      inputSchema: {
        assetVersionFilters: z
          .array(
            z.object({
              assetKey: z.string().uuid(),
              revisionNumber: z.number().int().positive().optional(),
            })
          )
          .describe("List of {assetKey, revisionNumber?} filters"),
        embeds: z
          .array(
            z.enum([
              "releaseNote",
              "icon",
              "sourceCode",
              "signature",
              "metadata",
            ])
          )
          .optional()
          .describe("Extra fields to embed per asset"),
      },
    },
    async (args) => {
      try {
        const data = await client.post<unknown>("asset-repository", "/assets/search", args);
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
