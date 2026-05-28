import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerMobileBuildValidate(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "mobile_build_validate",
    {
      title: "Validate native build inputs (pre-flight)",
      description:
        "Cheap pre-flight check: validates that a mobile_build_start would succeed given the proposed inputs. Wraps POST /api/native-mobile-builds/v1/build-operations/native-build-validation. Use BEFORE mobile_build_start to catch missing Android package identifier, iOS signing certs, etc. — saves wasting a build slot.",
      inputSchema: {
        applicationKey: z.string().uuid(),
        environmentKey: z.string().uuid(),
        buildKey: z.string().uuid(),
        revision: z.number().int().positive(),
        mobilePlatform: z.enum(["Android", "iOS"]).optional().describe("Omit to validate both platforms"),
      },
    },
    async (args) => {
      try {
        const data = await client.post<unknown>(
          "native-mobile-builds",
          "/build-operations/native-build-validation",
          args
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
