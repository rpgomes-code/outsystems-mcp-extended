import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerAssetConfigGetApp(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "asset_config_get_app",
    {
      title: "Get deployed-app configurations",
      description:
        "Retrieve the runtime configurations of a deployed application in a given environment. Wraps GET /api/asset-configurations/v1/environments/{envKey}/applications/{appKey}/revisions/deployed/configurations. Use to debug 'why is prod config different from dev?'.",
      inputSchema: {
        environmentKey: z
          .string()
          .uuid()
          .describe("UUID of the environment (stage)"),
        applicationKey: z
          .string()
          .uuid()
          .describe("UUID of the deployed application"),
        fields: z
          .string()
          .optional()
          .describe(
            "Comma-separated list of fields to include (e.g. systemConfigurations)"
          ),
        showBinaryValues: z
          .boolean()
          .optional()
          .describe("Whether to return binary configuration values"),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "asset-configurations",
          `/environments/${encodeURIComponent(args.environmentKey)}/applications/${encodeURIComponent(args.applicationKey)}/revisions/deployed/configurations`,
          {
            fields: args.fields,
            showBinaryValues: args.showBinaryValues,
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
