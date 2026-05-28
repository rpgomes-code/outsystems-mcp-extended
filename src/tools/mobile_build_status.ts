import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerMobileBuildStatus(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "mobile_build_status",
    {
      title: "Poll native mobile build",
      description:
        "Retrieve status and details of a native mobile build operation. Wraps GET /api/native-mobile-builds/v1/build-operations/{operationKey}. Poll after mobile_build_start until terminal; when complete the response carries download URLs.",
      inputSchema: {
        operationKey: z
          .string()
          .uuid()
          .describe("Operation key returned by mobile_build_start"),
        environmentKey: z
          .string()
          .uuid()
          .optional()
          .describe("Environment key (recommended to scope the lookup)"),
        applicationKey: z
          .string()
          .uuid()
          .optional()
          .describe("Application key (recommended to scope the lookup)"),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "native-mobile-builds",
          `/build-operations/${encodeURIComponent(args.operationKey)}`,
          {
            environmentKey: args.environmentKey,
            applicationKey: args.applicationKey,
          }
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        if (err instanceof HttpError) {
          return {
            content: [{ type: "text", text: `Request failed: ${err.message}` }],
            isError: true,
          };
        }
        throw err;
      }
    }
  );
}
