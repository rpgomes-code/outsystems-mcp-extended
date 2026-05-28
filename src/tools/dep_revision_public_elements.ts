import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerDepRevisionPublicElements(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "dep_revision_public_elements",
    {
      title: "List public elements exposed by a revision",
      description:
        "List the public entities, actions, structures exposed by a specific asset revision. Wraps GET /api/dependency-management/v1/assets/{assetKey}/revisions/{revision}/public-elements. Use to understand the public API contract of an asset version.",
      inputSchema: {
        assetKey: z.string().uuid(),
        revisionNumber: z.number().int().positive(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "dependency-management",
          `/assets/${encodeURIComponent(args.assetKey)}/revisions/${args.revisionNumber}/public-elements`
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
