import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerQualityFindingsTrend(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "quality_findings_trend",
    {
      title: "Code quality findings trend",
      description:
        "Historical trend of code-quality findings over time. Wraps GET /api/code-quality/v1/findings-trend. Use to track 'are we getting better or worse?'",
      inputSchema: {
        assetKey: z.string().uuid().optional(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>("code-quality", "/findings-trend", args);
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
