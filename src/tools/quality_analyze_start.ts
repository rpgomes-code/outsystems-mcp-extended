import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerQualityAnalyzeStart(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "quality_analyze_start",
    {
      title: "Start code-quality analysis",
      description:
        "Submit a code-quality analysis request for a specific asset revision. Async — returns an analysis key; poll with quality_analyze_status. Wraps POST /api/code-quality/v1/code-analyses. Use before quality_asset_summary when a revision hasn't been analyzed yet (404 OS-AIMS-40412).",
      inputSchema: {
        assetKey: z
          .string()
          .uuid()
          .describe("UUID of the asset to analyze"),
        assetRevision: z
          .number()
          .int()
          .positive()
          .describe("Revision number of the asset to analyze"),
      },
    },
    async (args) => {
      try {
        const data = await client.post<unknown>(
          "code-quality",
          "/code-analyses",
          {
            assetKey: args.assetKey,
            assetRevision: args.assetRevision,
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
