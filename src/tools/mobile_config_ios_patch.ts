import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../config.js";
import type { TokenStore } from "../token-store.js";
import { OdcRestClient, HttpError } from "../client.js";

// API body shape: IosBuildConfigurationRequest with flat fields at root.
// Each field is a StringPatchConfig = { value: T } envelope.

export function registerMobileConfigIosPatch(
  server: McpServer,
  config: Config,
  tokenStore: TokenStore
): void {
  const client = new OdcRestClient(config, tokenStore);

  server.registerTool(
    "mobile_config_ios_patch",
    {
      title: "Update iOS build configuration",
      description:
        "Update the iOS build configuration of a mobile app (signing cert, provisioning profile, bundle identifier, MABS version, framework). Wraps PATCH /api/native-mobile-builds/v1/environments/{env}/applications/{app}/configurations/ios. All fields are optional partial updates.",
      inputSchema: {
        environmentKey: z.string().uuid(),
        applicationKey: z.string().uuid(),
        appIdentifier: z.string().optional().describe("iOS bundle identifier, e.g. com.company.app"),
        certificate: z.string().optional(),
        certificateName: z.string().optional(),
        certificatePassword: z.string().optional(),
        provisioningProfile: z.string().optional(),
        provisioningProfileName: z.string().optional(),
        buildType: z.string().optional(),
        mabsVersion: z.string().optional(),
        mobileFramework: z.string().optional(),
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
          `/environments/${encodeURIComponent(environmentKey)}/applications/${encodeURIComponent(applicationKey)}/configurations/ios`,
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
