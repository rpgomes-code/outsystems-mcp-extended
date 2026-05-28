import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerDepReferencedElements(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "dep_referenced_elements",
    {
      title: "List elements referenced by a revision",
      description:
        "List the public elements (from other assets) that a specific revision actually uses. Wraps GET /api/dependency-management/v1/assets/{assetKey}/revisions/{revision}/referenced-elements. Use to scope refactors — 'what would I lose if I dropped this dependency?'",
      inputSchema: {
        assetKey: z.string().uuid(),
        revisionNumber: z.number().int().positive(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "dependency-management",
          `/assets/${encodeURIComponent(args.assetKey)}/revisions/${args.revisionNumber}/referenced-elements`
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
