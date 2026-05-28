# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — Initial public release

Sibling MCP server that fills gaps in the official OutSystems ODC MCP by
wrapping the public ODC REST APIs directly. Runs as a local stdio MCP server
that any MCP-capable client (Claude Code, VS Code with the right extension,
Cursor, Continue, Aider, etc.) can use alongside the official MCP.

### Auth

- OAuth/PKCE flow with a local callback listener (`authenticate` tool).
- Manual fallback for remote sessions where the localhost callback cannot
  be reached (`complete_authentication` tool — pass the URL the browser
  ended up at after authorizing).
- Refresh-token handling on 401 (reactive — when a REST call returns 401
  and the token store has a refresh token, the client exchanges it for a
  fresh access token and retries the original request once).
- Optional `OS_BEARER_TOKEN` env var to skip the OAuth flow entirely
  (intended for CI / headless use).

### Tools (55 total)

**Identity** (3): `authenticate`, `complete_authentication`, `auth_status`.

**Apps + Asset Repository** (7): `asset_list`, `asset_get`,
`asset_revision_get`, `asset_revisions_list`, `asset_revision_metadata`,
`asset_revision_release_notes`, `asset_search`.

**Asset Configurations** (3): `asset_config_get_app`,
`asset_config_get_agent`, `asset_config_env_defaults`.

**Code Quality** (10): `quality_findings`, `quality_asset_summary`,
`quality_analyze_start`, `quality_analyze_status`,
`quality_findings_summary`, `quality_findings_trend`,
`quality_patterns_list`, `quality_pattern_get`, `quality_analysis_status`,
`quality_assets_metrics`.

**Dependency Management** (9): `dep_consumers`, `dep_producers`,
`dep_revision_public_elements`, `dep_referenced_elements`,
`dep_public_elements_search`, `dep_deletion_analysis_start`,
`dep_deletion_analysis_status`, `dep_deployment_analysis_start`,
`dep_deployment_analysis_status`.

**Portfolio** (1): `portfolio_deployed_assets` — cross-environment
deployed-asset inventory.

**Native Mobile Build** (11): `mobile_build_start`, `mobile_build_status`,
`mobile_build_validate`, `mobile_build_logs`, `mobile_build_list`,
`mobile_version_suggestions`, `mobile_builder_versions`,
`mobile_config_android_get`, `mobile_config_android_patch`,
`mobile_config_ios_get`, `mobile_config_ios_patch`.

**User & Access Management (reads)** (8): `uam_user_search`, `uam_user_get`,
`uam_user_application_roles`, `uam_application_role_list`,
`uam_application_role_users`, `uam_groups_list`, `uam_permissions_list`,
`uam_organization_roles_list`.

**Environment Configurations (reads)** (3): `env_config_domains_list`,
`env_config_default_domain`, `env_config_ip_filter_groups_list`.

### REST client

- Wraps every endpoint at `https://<tenant>/api/<service>/v1/<path>`.
- Bearer-auth on every request, pulled fresh from the in-memory token store.
- Automatic refresh + retry on 401 when a refresh token is available.
- Query-parameter serialisation for arrays as repeated keys (OpenAPI
  form-style + explode=true, the spec default).
- `PATCH` support for the native-mobile-builds configuration endpoints,
  with `204 No Content` handled cleanly.

### Known limitations

- Some endpoints have schema quirks the OpenAPI documentation doesn't fully
  capture (e.g. native-mobile-builds PATCH bodies use a flat
  `AndroidBuildConfigurationRequest` shape with each field as a
  `{ value: T }` envelope). See inline comments in the relevant tool files.
- Long-running build operations sign their download URLs for 600 seconds.
  Re-fetch status to mint a fresh URL if the original expired.
- The mentor / OML-editing surface is intentionally out of scope — that is
  the official MCP's domain and not exposed in any public REST API.
