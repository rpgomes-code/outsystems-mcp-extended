import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerQualityFindingsSummary(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "quality_findings_summary",
    {
      title: "Code quality findings summary",
      description:
        "Aggregate summary of code-quality findings across the tenant — counts by category and severity. Wraps GET /api/code-quality/v1/findings-summary. Use for dashboards or 'what's our overall quality posture' queries.",
      inputSchema: {
        assetKey: z.string().uuid().optional(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>("code-quality", "/findings-summary", args);
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
