import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerMobileBuildList(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "mobile_build_list",
    {
      title: "List native mobile builds",
      description:
        "List native mobile build operations across the tenant. Wraps GET /api/native-mobile-builds/v1/build-operations. Use to recover lost operation keys or audit recent builds.",
      inputSchema: {
        environmentKey: z.string().uuid().optional(),
        applicationKey: z.string().uuid().optional(),
        limit: z.number().int().positive().max(500).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>("native-mobile-builds", "/build-operations", args);
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
