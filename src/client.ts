// ─────────────────────────────────────────────────────────────────────────────
// REST client for OutSystems ODC public APIs.
//
// Every public ODC API follows the same URL shape:
//   https://<tenant>/api/<service>/v1/<path>
// …authenticated with a Bearer JWT identical to what ServiceStudio and the
// official MCP use. This file is the only place in the codebase that talks
// HTTP — each MCP tool calls one of get/post/patch/delete and forwards the
// result.
//
// Two behaviours worth knowing:
//
//   1. Silent 401-refresh-retry.
//      If a request comes back 401 and we have a refresh_token in the token
//      store, we POST to /mcp/token, swap in the new access_token, and retry
//      the same request exactly once. This means a session that originally
//      logged in via OAuth stays alive across the access-token TTL (a few
//      minutes) without bothering the user.
//
//   2. Array query-parameter serialization.
//      OpenAPI's default for array-typed query params is form-style with
//      explode=true — i.e. repeated keys (`?tags=a&tags=b`), not a CSV value.
//      We honour that in `applyParams` because several ODC endpoints reject
//      the CSV form.
//
// Errors are surfaced as a typed `HttpError` so tool handlers can decide how
// to render them. The response body is truncated to 400 chars in the error
// message because the API occasionally returns large HTML pages for proxy
// errors that would otherwise dwarf the actual problem.
// ─────────────────────────────────────────────────────────────────────────────

import type { Config } from "./config.js";
import type { TokenStore } from "./token-store.js";
import { refreshAccessToken } from "./oauth.js";

/** Allowed types for a single query parameter value. */
export type QueryValue =
  | string
  | number
  | boolean
  | (string | number)[]
  | undefined
  | null;

export class OdcRestClient {
  constructor(
    private config: Config,
    private tokenStore: TokenStore
  ) {}

  /** Build a service-rooted base URL. Every public endpoint hangs off v1. */
  private baseUrl(service: string): string {
    return `https://${this.config.tenant}/api/${service}/v1`;
  }

  /**
   * Pull the current bearer from the token store. Throws with a hint pointing
   * to either of the two ways a token can land in the store.
   */
  private getBearer(): string {
    const token = this.tokenStore.get();
    if (!token) {
      throw new Error(
        "Not authenticated. Call the `authenticate` tool first, or set OS_BEARER_TOKEN env var at startup."
      );
    }
    return token;
  }

  /**
   * Bearer-auth wrapper around `fetch` with transparent refresh-on-401.
   * Headers are rebuilt on each call so the retry picks up the post-refresh
   * access token instead of the stale one.
   */
  private async authedFetch(
    url: string | URL,
    init: Omit<RequestInit, "headers"> = {},
    extraHeaders: Record<string, string> = {}
  ): Promise<Response> {
    const buildHeaders = (): Record<string, string> => ({
      Authorization: `Bearer ${this.getBearer()}`,
      Accept: "application/json",
      ...extraHeaders,
    });

    let res = await fetch(url, { ...init, headers: buildHeaders() });

    // Reactive refresh: only when we actually see a 401 and have a refresh
    // token to spend. Refresh failures are logged but the original 401 is
    // surfaced to the caller — masking it would hide a real auth problem.
    if (res.status === 401 && this.tokenStore.hasRefreshToken()) {
      const refreshToken = this.tokenStore.getRefreshToken();
      if (refreshToken) {
        try {
          const fresh = await refreshAccessToken(this.config, refreshToken);
          this.tokenStore.setFromTokenResponse(fresh);
          console.error(
            "[client] Access token refreshed after 401; retrying request"
          );
          res = await fetch(url, { ...init, headers: buildHeaders() });
        } catch (err) {
          console.error(
            `[client] Refresh failed: ${
              err instanceof Error ? err.message : String(err)
            }. Surfacing original 401.`
          );
        }
      }
    }

    return res;
  }

  /**
   * Apply a flat parameter bag to a URL's querystring. Arrays become repeated
   * keys (OpenAPI form-style + explode=true). Empty strings, `undefined`, and
   * `null` are dropped so tool handlers can pass optional Zod fields through
   * unconditionally.
   */
  private applyParams(url: URL, params: Record<string, QueryValue>): void {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item !== undefined && item !== null && item !== "") {
            url.searchParams.append(k, String(item));
          }
        }
      } else if (v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }

  /** GET /api/<service>/v1/<path>?<params>. Parses the response as JSON. */
  async get<T>(
    service: string,
    path: string,
    params?: Record<string, QueryValue>
  ): Promise<T> {
    const url = new URL(this.baseUrl(service) + path);
    if (params) this.applyParams(url, params);

    const res = await this.authedFetch(url);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HttpError(res.status, res.statusText, url.toString(), body);
    }

    return (await res.json()) as T;
  }

  /** POST with a JSON body. */
  async post<T>(service: string, path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl(service)}${path}`;
    const res = await this.authedFetch(
      url,
      { method: "POST", body: JSON.stringify(body) },
      { "Content-Type": "application/json" }
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new HttpError(res.status, res.statusText, url, errBody);
    }

    return (await res.json()) as T;
  }

  /**
   * PATCH with a JSON body. Some ODC endpoints (notably native-mobile-builds
   * configuration patches) return 204 No Content on success — handled here so
   * callers don't have to special-case the empty body.
   */
  async patch<T>(service: string, path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl(service)}${path}`;
    const res = await this.authedFetch(
      url,
      { method: "PATCH", body: JSON.stringify(body) },
      { "Content-Type": "application/json" }
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new HttpError(res.status, res.statusText, url, errBody);
    }

    // PATCH may return 204 No Content. Also handle 200 with an empty body
    // defensively — some proxies strip the body but leave the status code.
    if (res.status === 204) return undefined as unknown as T;
    const text = await res.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text) as T;
  }

  /** DELETE — response body ignored. */
  async delete(service: string, path: string): Promise<void> {
    const url = `${this.baseUrl(service)}${path}`;
    const res = await this.authedFetch(url, { method: "DELETE" });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HttpError(res.status, res.statusText, url, body);
    }
  }
}

/**
 * Typed error carrying the full HTTP context. The message embeds a truncated
 * snippet of the response body so log lines stay readable even when the API
 * returns a large HTML proxy-error page.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    public body: string
  ) {
    const truncated = body.length > 400 ? body.slice(0, 400) + "…" : body;
    super(
      `HTTP ${status} ${statusText} for ${url}${
        truncated ? ` — ${truncated}` : ""
      }`
    );
    this.name = "HttpError";
  }
}
