# Contributing

Thanks for your interest in improving this project. The repo is small and the
contribution path is intentionally lightweight.

## Project shape

```
src/
├── server.ts                MCP server bootstrap (stdio transport)
├── config.ts                Env-var loading
├── auth.ts                  JWT decoder (no signature verification — diagnostic only)
├── oauth.ts                 OAuth/PKCE helpers + token-endpoint POSTs
├── callback-server.ts       Local HTTP listener for the OAuth callback
├── token-store.ts           In-memory access + refresh token storage
├── pending-auth-store.ts    Holds in-flight PKCE state between authenticate calls
├── client.ts                REST client (Bearer auth + refresh-on-401 + array params)
└── tools/                   One file per registered MCP tool
```

Every tool file follows the same template: define a `register*` function that
receives `(server, config, tokenStore)`, register a tool with a name, title,
description, and Zod input schema, and implement the handler that calls
`client.get/post/patch/delete` and wraps the result in MCP content.

## Adding a new tool

1. Find the OpenAPI spec for the endpoint you want to wrap in the
   `OutSystems/docs-odc` repository under
   `src/eap/reference/apis/resources/`.
2. Confirm the method, path, query parameters, and request/response shape.
3. Copy an existing tool file in `src/tools/` that has a similar shape (read
   vs. write, with/without path params, etc.) and rename it.
4. Adjust the Zod input schema, the path template, and the parameters /
   body passed to the REST client.
5. Import + register the new tool in `src/server.ts`.
6. Build with `npm run build` and smoke-test via stdio (see below).

## Local development

```bash
npm install
npm run build           # one-off compile
npm run watch           # tsc in watch mode
npm run dev             # tsx — runs directly from src/, no build step
```

Required environment variables for runtime:

- `OS_TENANT` — your ODC tenant hostname (e.g. `mytenant.outsystems.dev`).
- `OS_BEARER_TOKEN` — optional. Pre-seeds a bearer token to skip the OAuth
  flow at startup. Useful for CI / headless tests.

## Smoke testing the MCP protocol over stdio

Send a minimal handshake + `tools/list` request and verify the response:

```bash
OS_TENANT=mytenant.outsystems.dev node dist/server.js <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
EOF
```

You should see a `serverInfo` object back, followed by the full list of
registered tools.

## Coding conventions

- Strict TypeScript (`strict: true` in `tsconfig.json`). Don't disable.
- ESM modules — every relative import ends in `.js` (the TypeScript-on-NodeNext
  convention).
- All Zod schemas live in the tool's `inputSchema`, not as separate exported
  types — keeps each tool self-contained.
- Tools that wrap a non-trivial endpoint quirk (e.g. the
  `mobile_config_*_patch` body envelope) should explain the quirk in a
  comment at the top of the file.
- No `console.log` in tools — `console.error` for server logs (stdout is
  reserved for the MCP protocol on stdio transport).

## Pull requests

- One feature or fix per PR.
- Update `CHANGELOG.md` under a new `[Unreleased]` section.
- Build must pass (`npm run build`).
- If you add a new tool, include a one-paragraph description in the PR body
  explaining the use case and the underlying REST endpoint.

## Reporting bugs

Open a GitHub issue with:

- The tool name and the input you passed (redact any keys / tokens).
- The full error message including the OutSystems `errorCode` (e.g.
  `OS-NAOS-40400`).
- Your `OS_TENANT` hostname's domain pattern (not the full hostname unless
  it's a public test tenant).
- Node version (`node --version`).
