#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// outsystems-mcp-extended — entry point
//
// This file does three things:
//   1. Boots an MCP server (stdio transport — the same transport the official
//      OutSystems MCP and the @modelcontextprotocol/sdk reference servers use).
//   2. Loads the runtime config (tenant hostname + optional pre-seeded token).
//   3. Registers every tool the server exposes by calling its `register*`
//      function with a shared `(server, config, tokenStore)` triple.
//
// Each tool lives in its own file under `src/tools/`. The registration calls
// below are grouped by ODC service so the catalog is readable at a glance —
// the order has no runtime significance.
//
// On startup the server prints a single status line to stderr (stdout is
// reserved for the MCP JSON-RPC protocol on stdio transport).
// ─────────────────────────────────────────────────────────────────────────────

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { TokenStore } from "./token-store.js";
import { PendingAuthStore } from "./pending-auth-store.js";

// Auth (3) — OAuth/PKCE driver + local token introspection.
import { registerAuthenticate } from "./tools/authenticate.js";
import { registerCompleteAuthentication } from "./tools/complete_authentication.js";
import { registerAuthStatus } from "./tools/auth_status.js";

// Code Quality (10) — static-analysis findings, patterns, async re-analysis.
import { registerQualityFindings } from "./tools/quality_findings.js";
import { registerQualityAssetSummary } from "./tools/quality_asset_summary.js";
import { registerQualityAnalyzeStart } from "./tools/quality_analyze_start.js";
import { registerQualityAnalyzeStatus } from "./tools/quality_analyze_status.js";
import { registerQualityFindingsSummary } from "./tools/quality_findings_summary.js";
import { registerQualityFindingsTrend } from "./tools/quality_findings_trend.js";
import { registerQualityPatternsList } from "./tools/quality_patterns_list.js";
import { registerQualityPatternGet } from "./tools/quality_pattern_get.js";
import { registerQualityAnalysisStatus } from "./tools/quality_analysis_status.js";
import { registerQualityAssetsMetrics } from "./tools/quality_assets_metrics.js";

// Dependency Management (9) — refactor blast-radius + impact analyses.
import { registerDepConsumers } from "./tools/dep_consumers.js";
import { registerDepDeletionAnalysisStart } from "./tools/dep_deletion_analysis_start.js";
import { registerDepDeletionAnalysisStatus } from "./tools/dep_deletion_analysis_status.js";
import { registerDepPublicElementsSearch } from "./tools/dep_public_elements_search.js";
import { registerDepDeploymentAnalysisStart } from "./tools/dep_deployment_analysis_start.js";
import { registerDepDeploymentAnalysisStatus } from "./tools/dep_deployment_analysis_status.js";
import { registerDepProducers } from "./tools/dep_producers.js";
import { registerDepRevisionPublicElements } from "./tools/dep_revision_public_elements.js";
import { registerDepReferencedElements } from "./tools/dep_referenced_elements.js";

// Asset Repository (7) — canonical inventory + revision introspection.
import { registerAssetList } from "./tools/asset_list.js";
import { registerAssetGet } from "./tools/asset_get.js";
import { registerAssetRevisionGet } from "./tools/asset_revision_get.js";
import { registerAssetRevisionsList } from "./tools/asset_revisions_list.js";
import { registerAssetRevisionMetadata } from "./tools/asset_revision_metadata.js";
import { registerAssetRevisionReleaseNotes } from "./tools/asset_revision_release_notes.js";
import { registerAssetSearch } from "./tools/asset_search.js";

// Asset Configurations (3) — site-property / runtime config of deployed apps.
import { registerAssetConfigGetApp } from "./tools/asset_config_get_app.js";
import { registerAssetConfigGetAgent } from "./tools/asset_config_get_agent.js";
import { registerAssetConfigEnvDefaults } from "./tools/asset_config_env_defaults.js";

// Portfolio (1) — cross-environment "what's deployed where" inventory.
import { registerPortfolioDeployedAssets } from "./tools/portfolio_deployed_assets.js";

// Native Mobile Build (11) — Android / iOS build configuration + execution.
import { registerMobileBuildStart } from "./tools/mobile_build_start.js";
import { registerMobileBuildStatus } from "./tools/mobile_build_status.js";
import { registerMobileBuildValidate } from "./tools/mobile_build_validate.js";
import { registerMobileBuildLogs } from "./tools/mobile_build_logs.js";
import { registerMobileBuildList } from "./tools/mobile_build_list.js";
import { registerMobileVersionSuggestions } from "./tools/mobile_version_suggestions.js";
import { registerMobileConfigAndroidGet } from "./tools/mobile_config_android_get.js";
import { registerMobileConfigAndroidPatch } from "./tools/mobile_config_android_patch.js";
import { registerMobileConfigIosGet } from "./tools/mobile_config_ios_get.js";
import { registerMobileConfigIosPatch } from "./tools/mobile_config_ios_patch.js";
import { registerMobileBuilderVersions } from "./tools/mobile_builder_versions.js";

// User & Access Management (8) — read-only views over users, roles, groups.
import { registerUamUserSearch } from "./tools/uam_user_search.js";
import { registerUamUserGet } from "./tools/uam_user_get.js";
import { registerUamUserApplicationRoles } from "./tools/uam_user_application_roles.js";
import { registerUamApplicationRoleList } from "./tools/uam_application_role_list.js";
import { registerUamApplicationRoleUsers } from "./tools/uam_application_role_users.js";
import { registerUamGroupsList } from "./tools/uam_groups_list.js";
import { registerUamPermissionsList } from "./tools/uam_permissions_list.js";
import { registerUamOrganizationRolesList } from "./tools/uam_organization_roles_list.js";

// Environment Configurations (3) — domains + IP filter groups (reads).
import { registerEnvConfigDomainsList } from "./tools/env_config_domains_list.js";
import { registerEnvConfigDefaultDomain } from "./tools/env_config_default_domain.js";
import { registerEnvConfigIpFilterGroupsList } from "./tools/env_config_ip_filter_groups_list.js";

async function main(): Promise<void> {
  // Fail fast if the tenant env var is missing or malformed.
  const config = loadConfig();

  // Shared state. Both stores are plain in-memory singletons — no persistence,
  // no shared filesystem footprint. Anything held here dies with the process.
  const tokenStore = new TokenStore();
  const pendingAuthStore = new PendingAuthStore();

  // OS_BEARER_TOKEN is the headless / CI escape hatch — pre-seed the store so
  // tools that hit the REST API don't need an `authenticate` call first.
  // (Refresh-on-401 won't kick in for this path because we don't have a
  // refresh_token; the operator is on the hook for token freshness.)
  if (config.initialBearerToken) {
    tokenStore.setFromAccessToken(config.initialBearerToken);
  }

  const server = new McpServer({
    name: "outsystems-mcp-extended",
    version: "1.0.0",
  });

  // ───── Tool registration ───────────────────────────────────────────────────
  // Each call below registers exactly one tool with the MCP server. The order
  // is by service for readability — the SDK doesn't care.

  // Auth
  registerAuthenticate(server, config, tokenStore, pendingAuthStore);
  registerCompleteAuthentication(server, config, tokenStore, pendingAuthStore);
  registerAuthStatus(server, config, tokenStore);

  // Code Quality
  registerQualityFindings(server, config, tokenStore);
  registerQualityAssetSummary(server, config, tokenStore);
  registerQualityAnalyzeStart(server, config, tokenStore);
  registerQualityAnalyzeStatus(server, config, tokenStore);
  registerQualityFindingsSummary(server, config, tokenStore);
  registerQualityFindingsTrend(server, config, tokenStore);
  registerQualityPatternsList(server, config, tokenStore);
  registerQualityPatternGet(server, config, tokenStore);
  registerQualityAnalysisStatus(server, config, tokenStore);
  registerQualityAssetsMetrics(server, config, tokenStore);

  // Dependency Management
  registerDepConsumers(server, config, tokenStore);
  registerDepDeletionAnalysisStart(server, config, tokenStore);
  registerDepDeletionAnalysisStatus(server, config, tokenStore);
  registerDepPublicElementsSearch(server, config, tokenStore);
  registerDepDeploymentAnalysisStart(server, config, tokenStore);
  registerDepDeploymentAnalysisStatus(server, config, tokenStore);
  registerDepProducers(server, config, tokenStore);
  registerDepRevisionPublicElements(server, config, tokenStore);
  registerDepReferencedElements(server, config, tokenStore);

  // Asset Repository
  registerAssetList(server, config, tokenStore);
  registerAssetGet(server, config, tokenStore);
  registerAssetRevisionGet(server, config, tokenStore);
  registerAssetRevisionsList(server, config, tokenStore);
  registerAssetRevisionMetadata(server, config, tokenStore);
  registerAssetRevisionReleaseNotes(server, config, tokenStore);
  registerAssetSearch(server, config, tokenStore);

  // Asset Configurations
  registerAssetConfigGetApp(server, config, tokenStore);
  registerAssetConfigGetAgent(server, config, tokenStore);
  registerAssetConfigEnvDefaults(server, config, tokenStore);

  // Portfolio
  registerPortfolioDeployedAssets(server, config, tokenStore);

  // Native Mobile Build
  registerMobileBuildStart(server, config, tokenStore);
  registerMobileBuildStatus(server, config, tokenStore);
  registerMobileBuildValidate(server, config, tokenStore);
  registerMobileBuildLogs(server, config, tokenStore);
  registerMobileBuildList(server, config, tokenStore);
  registerMobileVersionSuggestions(server, config, tokenStore);
  registerMobileConfigAndroidGet(server, config, tokenStore);
  registerMobileConfigAndroidPatch(server, config, tokenStore);
  registerMobileConfigIosGet(server, config, tokenStore);
  registerMobileConfigIosPatch(server, config, tokenStore);
  registerMobileBuilderVersions(server, config, tokenStore);

  // User & Access Management
  registerUamUserSearch(server, config, tokenStore);
  registerUamUserGet(server, config, tokenStore);
  registerUamUserApplicationRoles(server, config, tokenStore);
  registerUamApplicationRoleList(server, config, tokenStore);
  registerUamApplicationRoleUsers(server, config, tokenStore);
  registerUamGroupsList(server, config, tokenStore);
  registerUamPermissionsList(server, config, tokenStore);
  registerUamOrganizationRolesList(server, config, tokenStore);

  // Environment Configurations
  registerEnvConfigDomainsList(server, config, tokenStore);
  registerEnvConfigDefaultDomain(server, config, tokenStore);
  registerEnvConfigIpFilterGroupsList(server, config, tokenStore);

  // ───── Transport ──────────────────────────────────────────────────────────
  // Stdio transport: the MCP client (Claude Code, VS Code, etc.) spawns this
  // process as a child and pipes JSON-RPC over stdin/stdout. We MUST keep
  // stdout clean — only the SDK writes to it.
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Single startup status line to stderr — visible in client-side MCP logs.
  const status = tokenStore.get()
    ? "seeded from env"
    : "awaiting `authenticate`";
  console.error(
    `outsystems-mcp-extended v1.0.0 — tenant=${config.tenant} — auth ${status} — 55 tools — ready on stdio`
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
