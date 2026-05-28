import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerAssetConfigGetAgent(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "asset_config_get_agent",
    {
      title: "Get deployed-agent configurations",
      description:
        "Retrieve runtime configurations of a deployed AI Agent in an environment. Wraps GET /api/asset-configurations/v1/environments/{envKey}/agents/{agentKey}/revisions/deployed/configurations.",
      inputSchema: {
        environmentKey: z.string().uuid(),
        agentKey: z.string().uuid(),
        fields: z.string().optional(),
        showBinaryValues: z.boolean().optional(),
      },
    },
    async (args) => {
      const { environmentKey, agentKey, ...query } = args;
      try {
        const data = await client.get<unknown>(
          "asset-configurations",
          `/environments/${encodeURIComponent(environmentKey)}/agents/${encodeURIComponent(agentKey)}/revisions/deployed/configurations`,
          query
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
