import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerDepProducers(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "dep_producers",
    {
      title: "List producer assets",
      description:
        "What does this asset revision depend on? Returns the list of producer (upstream) assets. Wraps GET /api/dependency-management/v1/assets/{assetKey}/revisions/{revision}/producers. Inverse of dep_consumers.",
      inputSchema: {
        assetKey: z.string().uuid(),
        revisionNumber: z.number().int().positive(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "dependency-management",
          `/assets/${encodeURIComponent(args.assetKey)}/revisions/${args.revisionNumber}/producers`
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
