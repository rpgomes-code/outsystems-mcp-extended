import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerDepDeletionAnalysisStatus(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "dep_deletion_analysis_status",
    {
      title: "Poll deletion-impact analysis",
      description:
        "Retrieve the deletion-impact analysis report. Wraps GET /api/dependency-management/v1/deletion-analyses/{analysisKey}. Poll after dep_deletion_analysis_start until report is complete.",
      inputSchema: {
        analysisKey: z
          .string()
          .uuid()
          .describe("Analysis key returned by dep_deletion_analysis_start"),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "dependency-management",
          `/deletion-analyses/${encodeURIComponent(args.analysisKey)}`
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
