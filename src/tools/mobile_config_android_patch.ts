import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

// API body shape: AndroidBuildConfigurationRequest with flat fields at root.
// Each field is a StringPatchConfig (or similar) = { value: T } envelope so
// the server can distinguish "set to value" from "leave alone" (field absent).
// No outer wrapper despite what one error message hinted at.

export function registerMobileConfigAndroidPatch(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "mobile_config_android_patch",
    {
      title: "Update Android build configuration",
      description:
        "Update the Android build configuration of a mobile app (set appIdentifier package name, keystore, MABS version, etc.). Wraps PATCH /api/native-mobile-builds/v1/environments/{env}/applications/{app}/configurations/android. All fields are optional partial updates. Setting `appIdentifier` is typically what unblocks 'mobile_build_start' for a fresh Mobile-kind app.",
      inputSchema: {
        environmentKey: z.string().uuid(),
        applicationKey: z.string().uuid(),
        appIdentifier: z.string().optional().describe("Android package name, e.g. com.company.app"),
        keystore: z.string().optional().describe("Keystore reference"),
        keystoreName: z.string().optional(),
        keystorePassword: z.string().optional(),
        alias: z.string().optional(),
        aliasPassword: z.string().optional(),
        buildType: z.string().optional().describe("e.g. Debug, Release"),
        mabsVersion: z.string().optional(),
        mobileFramework: z.string().optional().describe("e.g. Capacitor"),
      },
    },
    async (args) => {
      const { environmentKey, applicationKey, ...fields } = args;
      const updates: Record<string, { value: string }> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) {
          updates[k] = { value: v };
        }
      }
      const body = updates;
      try {
        const data = await client.patch<unknown>(
          "native-mobile-builds",
          `/environments/${encodeURIComponent(environmentKey)}/applications/${encodeURIComponent(applicationKey)}/configurations/android`,
          body
        );
        return { content: [{ type: "text", text: JSON.stringify(data ?? { ok: true }, null, 2) }] };
      } catch (err) {
        if (err instanceof HttpError) {
          return { content: [{ type: "text", text: `Request failed: ${err.message}` }], isError: true };
        }
        throw err;
      }
    }
  );
}
