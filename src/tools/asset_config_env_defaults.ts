import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerAssetConfigEnvDefaults(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "asset_config_env_defaults",
    {
      title: "Get environment-level default configurations",
      description:
        "Retrieve env-wide default system configurations (SMTP, CSP, log level defaults). Wraps GET /api/asset-configurations/v1/environments/{envKey}/default-system-configurations.",
      inputSchema: {
        environmentKey: z.string().uuid(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "asset-configurations",
          `/environments/${encodeURIComponent(args.environmentKey)}/default-system-configurations`
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
