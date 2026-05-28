import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerQualityPatternGet(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "quality_pattern_get",
    {
      title: "Get code-quality pattern detail",
      description:
        "Retrieve full detail for a single code-quality pattern (description, rationale, severity, examples). Wraps GET /api/code-quality/v1/patterns/{patternId}. Use to look up the meaning of a patternId from quality_findings.",
      inputSchema: {
        patternId: z.string().describe("Pattern ID (e.g. MissingDescription)"),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "code-quality",
          `/patterns/${encodeURIComponent(args.patternId)}`
        );
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
