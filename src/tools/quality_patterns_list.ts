import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerQualityPatternsList(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "quality_patterns_list",
    {
      title: "List code-quality patterns",
      description:
        "List the catalog of code-quality patterns (rules) the platform checks for. Wraps GET /api/code-quality/v1/patterns. Use to discover what rules are enforced before writing code, or to look up a patternId returned by quality_findings.",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await client.get<unknown>("code-quality", "/patterns");
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
