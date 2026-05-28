import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerQualityAnalyzeStatus(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "quality_analyze_status",
    {
      title: "Poll code-quality analysis",
      description:
        "Retrieve status and findings of an in-flight or completed code-quality analysis. Wraps GET /api/code-quality/v1/code-analyses/{analysisKey}. Poll after quality_analyze_start until status is terminal, then use quality_asset_summary for the digested view.",
      inputSchema: {
        analysisKey: z
          .string()
          .uuid()
          .describe("Analysis key returned by quality_analyze_start"),
        Limit: z
          .number()
          .int()
          .positive()
          .max(500)
          .optional()
          .describe("Number of findings to return"),
        Offset: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Pagination offset for findings"),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "code-quality",
          `/code-analyses/${encodeURIComponent(args.analysisKey)}`,
          {
            Limit: args.Limit,
            Offset: args.Offset,
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
