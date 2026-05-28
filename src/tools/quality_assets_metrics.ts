import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerQualityAssetsMetrics(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "quality_assets_metrics",
    {
      title: "Code quality metrics per asset",
      description:
        "Quality metrics (scores, finding counts) per asset across the tenant. Wraps GET /api/code-quality/v1/assets-quality-metrics. Use to rank assets by quality or identify which ones need attention.",
      inputSchema: {
        limit: z.number().int().positive().max(500).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>("code-quality", "/assets-quality-metrics", args);
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
