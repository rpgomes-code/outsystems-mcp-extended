import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

export function registerMobileBuildStart(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "mobile_build_start",
    {
      title: "Start native mobile build",
      description:
        "Start a native iOS or Android build for a mobile application. Wraps POST /api/native-mobile-builds/v1/build-operations. Returns an operation key; poll with mobile_build_status. This is the entry point for the full native mobile workflow that's missing from the official MCP.",
      inputSchema: {
        applicationKey: z
          .string()
          .uuid()
          .describe("UUID of the mobile application"),
        environmentKey: z
          .string()
          .uuid()
          .describe("UUID of the environment to build for"),
        buildKey: z
          .string()
          .uuid()
          .describe(
            "UUID of the existing build (from publish_start / build_list) to package as a native binary"
          ),
        revision: z
          .number()
          .int()
          .positive()
          .describe("App revision number"),
        mobilePlatform: z
          .enum(["Android", "iOS"])
          .describe("Target platform"),
        mobileVersionNumber: z
          .string()
          .regex(/^\d+\.\d+\.\d+$/)
          .describe("Semantic version, e.g. 1.0.0"),
        mobileVersionCode: z
          .number()
          .int()
          .positive()
          .describe("Monotonically incrementing version code"),
      },
    },
    async (args) => {
      try {
        const data = await client.post<unknown>(
          "native-mobile-builds",
          "/build-operations",
          {
            applicationKey: args.applicationKey,
            environmentKey: args.environmentKey,
            buildKey: args.buildKey,
            revision: args.revision,
            mobilePlatform: args.mobilePlatform,
            mobileVersionNumber: args.mobileVersionNumber,
            mobileVersionCode: args.mobileVersionCode,
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
