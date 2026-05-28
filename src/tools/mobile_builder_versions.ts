import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerMobileBuilderVersions(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "mobile_builder_versions",
    {
      title: "List native builder versions",
      description:
        "List the native builder (MABS) versions available in the tenant. Wraps GET /api/native-mobile-builds/v1/native-builder-versions. Use to know which MABS versions can be set in mobile_config_android_patch / mobile_config_ios_patch.",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await client.get<unknown>("native-mobile-builds", "/native-builder-versions");
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
