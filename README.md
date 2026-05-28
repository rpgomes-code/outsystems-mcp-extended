# outsystems-mcp-extended

A community MCP server that **fills the gaps** in the official
[OutSystems ODC MCP](https://github.com/OutSystems/outsystems-mcp). It runs
alongside the official MCP (it does not replace it) and exposes 55 additional
tools — by wrapping the public ODC REST APIs directly.

## What's in the box

- **55 tools** across 8 ODC services
- **Built-in OAuth/PKCE** with silent refresh — no manual token copying
- **Strict TypeScript**, ESM, stdio transport, no runtime dependencies beyond
  the official MCP SDK and Zod
- **Zero proxy hops** — direct REST calls to `https://<tenant>/api/<service>/v1/`

| Area | Tools | Endpoint family |
|---|---|---|
| Identity (OAuth, token introspection) | 3 | `/mcp/authorize`, `/mcp/token` |
| Asset Repository + Search | 7 | `/api/asset-repository/v1/*` |
| Asset Configurations | 3 | `/api/asset-configurations/v1/*` |
| Code Quality | 10 | `/api/code-quality/v1/*` |
| Dependency Management | 9 | `/api/dependency-management/v1/*` |
| Portfolio | 1 | `/api/portfolios/v1/deployed-assets` |
| Native Mobile Build | 11 | `/api/native-mobile-builds/v1/*` |
| User & Access Management | 8 | `/api/identity/v1/*` |
| Environment Configurations | 3 | `/api/environment-configurations/v1/*` |

See [`CHANGELOG.md`](CHANGELOG.md) for the full per-tool catalog.

## Why this exists

The official MCP focuses on the IDE-authoring loop (apps, builds, deploys,
publish, Mentor). The public REST API surface is much larger — Code Quality
findings, dependency-impact analyses, asset introspection, native-mobile-build
configuration, UAM reads, environment configuration reads — and most of those
endpoints aren't wrapped in any MCP today.

This server closes that gap so a coding agent working in your IDE can answer
questions like:

- *"Before I delete this entity, who consumes it?"*
- *"What changed between revision 12 and revision 13 of this module?"*
- *"List every Code Quality finding above severity 7 in this module."*
- *"Trigger an Android build with the current configuration and give me the
  download URL when it's ready."*
- *"Which users have the `Admin` application role in this app?"*

…without leaving the editor.

## Install

```bash
# Run with npx (no install)
npx outsystems-mcp-extended

# Or install globally
npm install -g outsystems-mcp-extended
```

Requires Node ≥ 20.

## Configure

The server reads one required environment variable plus one optional override:

| Var | Required | Example |
|---|---|---|
| `OS_TENANT` | yes | `mytenant.outsystems.dev` |
| `OS_BEARER_TOKEN` | no | A JWT to pre-seed the token store (CI / headless) |

In most setups you'll skip `OS_BEARER_TOKEN` entirely — the built-in
OAuth/PKCE flow handles the token for you.

### Authentication

The server ships with a built-in OAuth/PKCE flow that mirrors the official
MCP's. From your IDE you'll see two tools:

- **`authenticate`** — opens the tenant's authorize URL in your browser. A
  local listener on `http://localhost:7891/callback` catches the redirect and
  exchanges the code for an access + refresh token. Tokens are held in
  memory only.
- **`complete_authentication { callback_url }`** — fallback for remote
  sessions (SSH, devcontainer, Codespaces) where the loopback callback can't
  be reached. After authorizing in the browser, copy the full callback URL
  from the address bar and pass it here.

Access-token TTL is short (a few minutes) but the OAuth flow also captures a
**refresh token**. When any REST call returns 401, the client transparently
exchanges the refresh token for a fresh access token and retries the request
once — so a single `authenticate` call typically lasts the whole session.

### Headless / CI use

Set `OS_BEARER_TOKEN` to a JWT to skip the OAuth flow at startup. The
`authenticate` tool then becomes optional.

## Wire it into your MCP client

### Claude Code

```bash
claude mcp add -s user --transport stdio outsystems-extended \
  --env OS_TENANT=mytenant.outsystems.dev \
  -- npx -y outsystems-mcp-extended
```

### VS Code (or any client with a JSON MCP config)

```json
{
  "mcpServers": {
    "outsystems-extended": {
      "command": "npx",
      "args": ["-y", "outsystems-mcp-extended"],
      "env": {
        "OS_TENANT": "mytenant.outsystems.dev"
      }
    }
  }
}
```

The exact key (`mcpServers` vs `servers`) varies by client. Consult your
client's MCP setup docs.

## Tool highlights

A few representative examples (full catalog in [`CHANGELOG.md`](CHANGELOG.md)):

- `asset_search` — fuzzy + filtered search across the asset repository.
- `dep_consumers` / `dep_producers` — refactor blast-radius before you touch
  a module.
- `dep_deletion_analysis_start` / `_status` — async impact analysis before
  destructive operations.
- `quality_findings` — static-analysis findings, filterable by asset,
  severity, pattern.
- `mobile_build_validate` — pre-flight all required config before kicking off
  a real build.
- `mobile_build_start` / `_status` — trigger an Android or iOS build and poll
  for the signed download URL.
- `portfolio_deployed_assets` — cross-environment inventory of what's running
  where.

## Architecture

```
src/
├── server.ts              # MCP bootstrap, registers all tools, stdio transport
├── config.ts              # Env-var loading
├── auth.ts                # JWT decoder (diagnostic only — no signature check)
├── oauth.ts               # OAuth/PKCE: authorize URL, code exchange, refresh
├── callback-server.ts     # Local HTTP listener for the OAuth redirect
├── token-store.ts         # In-memory access + refresh token storage
├── pending-auth-store.ts  # Holds in-flight PKCE state between calls
├── client.ts              # REST client (Bearer + 401-refresh-retry + arrays)
└── tools/                 # One file per registered MCP tool
```

Every tool file is the same template: a `register*` function that takes
`(server, config, tokenStore)`, defines a Zod input schema, and forwards to
`client.get/post/patch/delete`.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the adding-a-tool walkthrough
and local development notes.

## Relationship to the official MCP

This project is **not affiliated with OutSystems**. It's a community
companion to the official [OutSystems MCP](https://github.com/OutSystems/outsystems-mcp).

- **Official MCP**: IDE-authoring workflows (apps, modules, builds, deploys,
  publish, Mentor, external libraries).
- **This MCP**: read-heavy diagnostics and operations over public REST APIs
  the official MCP doesn't surface.

Run them side-by-side in your IDE — they don't overlap.

## Security notes

- Tokens are kept **in memory only**. There is no disk persistence.
- The OAuth callback listens on `127.0.0.1:7891` (loopback only).
- The JWT decoder in `auth.ts` does **not** verify signatures — it's used
  purely to surface non-sensitive claims (issuer, expiry, tenant ID) for the
  `auth_status` tool. The tenant's IdP is the source of truth.
- Bearer tokens never leave the local process except in `Authorization`
  headers sent to `https://<tenant>/...`.

## Contributing

PRs welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT — see [`LICENSE`](LICENSE).
