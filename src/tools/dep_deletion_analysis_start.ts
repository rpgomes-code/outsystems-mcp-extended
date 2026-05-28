import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerDepDeletionAnalysisStart(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "dep_deletion_analysis_start",
    {
      title: "Start deletion-impact analysis",
      description:
        "Launch an async analysis of what would break if an asset were deleted. Returns an analysis key; poll with dep_deletion_analysis_status. Wraps POST /api/dependency-management/v1/deletion-analyses. Use as pre-flight safety check before destructive operations.",
      inputSchema: {
        assetKey: z
          .string()
          .uuid()
          .describe("UUID of the asset whose deletion impact to analyze"),
      },
    },
    async (args) => {
      try {
        const data = await client.post<unknown>(
          "dependency-management",
          "/deletion-analyses",
          { assetKey: args.assetKey }
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
