import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerQualityAnalysisStatus(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "quality_analysis_status",
    {
      title: "Global code-quality analysis status",
      description:
        "Tenant-wide status of the code-quality analysis pipeline. Wraps GET /api/code-quality/v1/analysis-status. Useful for checking whether analyses are caught up before relying on findings/summary.",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await client.get<unknown>("code-quality", "/analysis-status");
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
