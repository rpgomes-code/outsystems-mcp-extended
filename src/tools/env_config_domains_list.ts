import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerEnvConfigDomainsList(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "env_config_domains_list",
    {
      title: "List environment custom domains",
      description:
        "List custom domains configured on an environment. Wraps GET /api/environment-configurations/v1/environments/{envKey}/domains. Use to answer 'which URL is my app served from?'",
      inputSchema: {
        environmentKey: z.string().uuid(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "environment-configurations",
          `/environments/${encodeURIComponent(args.environmentKey)}/domains`
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
