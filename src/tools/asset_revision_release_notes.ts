import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerAssetRevisionReleaseNotes(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "asset_revision_release_notes",
    {
      title: "Get asset revision release notes",
      description:
        "Retrieve the release notes of an asset revision. Wraps GET /api/asset-repository/v1/assets/{assetKey}/revisions/{revisionNumber}/release-notes. Use for changelog generation.",
      inputSchema: {
        assetKey: z.string().uuid(),
        revisionNumber: z.number().int().positive(),
      },
    },
    async (args) => {
      try {
        const data = await client.get<unknown>(
          "asset-repository",
          `/assets/${encodeURIComponent(args.assetKey)}/revisions/${args.revisionNumber}/release-notes`
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
