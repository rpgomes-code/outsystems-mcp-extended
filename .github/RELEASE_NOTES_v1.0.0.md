# v1.0.0 — Initial public release

A community MCP server that **fills the gaps** in the official
[OutSystems ODC MCP](https://github.com/OutSystems/outsystems-mcp). Runs
alongside the official MCP (sibling, not proxy) and exposes 55 tools by
wrapping the public ODC REST APIs directly.

## Highlights

- **55 tools** across 8 ODC services
- **Built-in OAuth/PKCE** with a local callback listener on `127.0.0.1:7891`
- **Silent refresh-on-401** in the REST client — single `authenticate` call lasts the session
- **In-memory token store only** — no disk persistence
- **Strict TypeScript**, ESM, stdio transport, single runtime dependency (the MCP SDK + Zod)

## Coverage

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

Full per-tool catalog in [`CHANGELOG.md`](https://github.com/rpgomes-code/outsystems-mcp-extended/blob/main/CHANGELOG.md).

## Install

```bash
# Run directly (no install)
npx outsystems-mcp-extended

# Or install globally
npm install -g outsystems-mcp-extended
```

Requires Node ≥ 20.

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

The first time a tool runs you'll be prompted to call `authenticate` — it
opens the tenant's authorize URL in your browser, catches the callback on
`localhost:7891`, and stores the tokens in memory.

## Documentation

- [`README.md`](https://github.com/rpgomes-code/outsystems-mcp-extended/blob/main/README.md) — full setup + features
- [`CHANGELOG.md`](https://github.com/rpgomes-code/outsystems-mcp-extended/blob/main/CHANGELOG.md) — per-tool catalog
- [`CONTRIBUTING.md`](https://github.com/rpgomes-code/outsystems-mcp-extended/blob/main/CONTRIBUTING.md) — project layout + adding a tool

## Not affiliated with OutSystems

This is a community project. The official MCP lives at
[OutSystems/outsystems-mcp](https://github.com/OutSystems/outsystems-mcp).
Both can run side-by-side in the same IDE — they don't overlap.
