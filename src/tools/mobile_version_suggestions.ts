import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerMobileVersionSuggestions(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "mobile_version_suggestions",
    {
      title: "Suggest next mobile version numbers",
      description:
        "Suggest the next mobileVersionNumber and mobileVersionCode for a mobile app based on previous builds. Wraps POST /api/native-mobile-builds/v1/build-operations/version-suggestions. Use before mobile_build_start to avoid colliding with prior versions.",
      inputSchema: {
        environmentKey: z.string().uuid(),
        applicationKey: z.string().uuid(),
        mobilePlatform: z.enum(["Android", "iOS"]).optional(),
      },
    },
    async (args) => {
      try {
        const data = await client.post<unknown>(
          "native-mobile-builds",
          "/build-operations/version-suggestions",
          args
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
