import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerMobileConfigIosGet(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "mobile_config_ios_get",
    {
      title: "Get iOS build configuration",
      description:
        "Retrieve the iOS build configuration of a mobile app in an environment (signing certificate, provisioning profile, appIdentifier bundle ID, MABS version, framework, build type). Wraps GET /api/native-mobile-builds/v1/environments/{env}/applications/{app}/configurations/ios.",
      inputSchema: {
        environmentKey: z.string().uuid(),
        applicationKey: z.string().uuid(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "native-mobile-builds",
          `/environments/${encodeURIComponent(args.environmentKey)}/applications/${encodeURIComponent(args.applicationKey)}/configurations/ios`
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
