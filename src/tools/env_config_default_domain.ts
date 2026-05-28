import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerEnvConfigDefaultDomain(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "env_config_default_domain",
    {
      title: "Get default domain for environment",
      description:
        "Retrieve the default domain that an environment uses to serve apps. Wraps GET /api/environment-configurations/v1/environments/{envKey}/default-domain.",
      inputSchema: {
        environmentKey: z.string().uuid(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "environment-configurations",
          `/environments/${encodeURIComponent(args.environmentKey)}/default-domain`
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
