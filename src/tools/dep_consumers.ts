import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerDepConsumers(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "dep_consumers",
    {
      title: "Dependency consumers",
      description:
        "List all consumer assets of a given asset — i.e., 'what other apps/libraries depend on this one'. Wraps GET /api/dependency-management/v1/assets/{assetKey}/consumers. Use before refactoring a public action or deleting a library to understand the blast radius.",
      inputSchema: {
        assetKey: z
          .string()
          .uuid()
          .describe("UUID of the asset whose consumers you want to list"),
        environmentKey: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Filter consumers by a specific environment. Defaults to the publishing environment (1CP) when omitted."
          ),
        publicElementKey: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Filter consumers by a specific public element (action/entity/structure) they use."
          ),
        allowMultipleVersions: z
          .boolean()
          .optional()
          .describe(
            "If true, returns multiple versions of a consumer asset. If false (default), returns only the highest version."
          ),
        sort: z
          .string()
          .optional()
          .describe(
            "Sort key. Allowed: name. Prepend '-' for descending (e.g. '-name')."
          ),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "dependency-management",
          `/assets/${encodeURIComponent(args.assetKey)}/consumers`,
          {
            environmentKey: args.environmentKey,
            publicElementKey: args.publicElementKey,
            allowMultipleVersions: args.allowMultipleVersions,
            sort: args.sort,
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
