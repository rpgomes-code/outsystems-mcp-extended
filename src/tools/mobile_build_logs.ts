import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerMobileBuildLogs(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "mobile_build_logs",
    {
      title: "Native mobile build log messages",
      description:
        "Fetch log messages for a native mobile build operation. Wraps GET /api/native-mobile-builds/v1/build-operations/{operationKey}/log-messages. Use to diagnose Error-status builds.",
      inputSchema: {
        operationKey: z.string().uuid().describe("Operation key from mobile_build_start"),
        environmentKey: z.string().uuid().optional(),
        applicationKey: z.string().uuid().optional(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "native-mobile-builds",
          `/build-operations/${encodeURIComponent(args.operationKey)}/log-messages`,
          {
            environmentKey: args.environmentKey,
            applicationKey: args.applicationKey,
          }
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
