import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerUamPermissionsList(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "uam_permissions_list",
    {
      title: "List permission catalog",
      description:
        "List the tenant's available permissions catalog (what permissions exist that can be assigned to roles). Wraps GET /api/identity/v1/permissions.",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await client.get<unknown>("identity", "/permissions");
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
