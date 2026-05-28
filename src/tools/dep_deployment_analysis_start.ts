import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerDepDeploymentAnalysisStart(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "dep_deployment_analysis_start",
    {
      title: "Start deployment-impact analysis",
      description:
        "Async analysis of what would change if an asset were deployed to a target environment. Wraps POST /api/dependency-management/v1/deployment-analyses. Returns an analysis key; poll with dep_deployment_analysis_status. Use as pre-flight before promoting to production.",
      inputSchema: {
        assetKey: z.string().uuid(),
        targetEnvironmentKey: z.string().uuid().optional(),
      },
    },
    async (args) => {
      try {
        const data = await client.post<unknown>("dependency-management", "/deployment-analyses", args);
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
