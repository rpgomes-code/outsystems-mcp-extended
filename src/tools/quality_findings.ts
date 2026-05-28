import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerQualityFindings(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "quality_findings",
    {
      title: "Code quality findings",
      description:
        "List static-analysis code-quality findings across the tenant. Optionally filter by asset, severity, or pattern ID. Wraps GET /api/code-quality/v1/findings. Useful pre-deploy or pre-refactor to catch regressions before they ship. Required permission: Asset Management > Read.",
      inputSchema: {
        assetKey: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Filter by a specific asset (application/library) UUID. Omit for tenant-wide."
          ),
        severity: z
          .enum(["Critical", "High", "Medium", "Low"])
          .optional()
          .describe("Filter by finding severity"),
        patternId: z
          .string()
          .optional()
          .describe("Filter by a specific code-quality pattern ID"),
        limit: z
          .number()
          .int()
          .positive()
          .max(500)
          .optional()
          .describe("Maximum number of findings to return"),
        offset: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "code-quality",
          "/findings",
          {
            assetKey: args.assetKey,
            severity: args.severity,
            patternId: args.patternId,
            limit: args.limit,
            offset: args.offset,
          }
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(data, null, 2) },
          ],
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
