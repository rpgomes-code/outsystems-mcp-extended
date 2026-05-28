import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerEnvConfigIpFilterGroupsList(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "env_config_ip_filter_groups_list",
    {
      title: "List environment IP filter groups",
      description:
        "List IP filter groups configured on an environment. Wraps GET /api/environment-configurations/v1/environments/{envKey}/ip-filter-groups. Use when debugging 403 errors that might be IP-restricted.",
      inputSchema: {
        environmentKey: z.string().uuid(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "environment-configurations",
          `/environments/${encodeURIComponent(args.environmentKey)}/ip-filter-groups`
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
