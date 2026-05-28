import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerQualityAssetSummary(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "quality_asset_summary",
    {
      title: "Code quality analysis summary",
      description:
        "Retrieve the code-quality analysis summary for a specific asset revision — findings breakdown by severity plus the quality score. Wraps GET /api/code-quality/v1/assets/{assetKey}/revisions/{revision}/analysis-summary. Use as a single-call 'should I deploy this revision?' check. Required permission: Analyze > View Code Quality findings.",
      inputSchema: {
        assetKey: z
          .string()
          .uuid()
          .describe("UUID of the asset (application or library)"),
        revision: z
          .number()
          .int()
          .positive()
          .describe("Revision number of the asset"),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "code-quality",
          `/assets/${encodeURIComponent(args.assetKey)}/revisions/${args.revision}/analysis-summary`
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
