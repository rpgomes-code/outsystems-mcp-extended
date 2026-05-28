// ─────────────────────────────────────────────────────────────────────────────
// Local HTTP listener for the OAuth redirect.
//
// After the user authorizes in their browser the IdP redirects to
//   http://localhost:7891/callback?code=…&state=…
// (or with `error=…` if they declined / something failed). This module spins
// up a tiny single-shot HTTP server bound to 127.0.0.1, returns the parsed
// querystring through a Promise, and shuts itself down.
//
// Design choices worth knowing:
//   - Loopback only. `server.listen(port, "127.0.0.1")` means LAN peers can't
//     hit this listener even on a shared network.
//   - Single shot. After the first valid /callback request we resolve the
//     promise, close the socket, and refuse any subsequent traffic.
//   - Timeout. If the user never returns (closed the browser, mistyped the
//     URL, etc.) we reject after `timeoutMs` so we don't keep a socket open
//     forever. Default 5 minutes — long enough to handle SSO + 2FA prompts,
//     short enough that a forgotten tab eventually frees the port.
//   - `cancel()` lets the orchestrator abort early (e.g. user invoked
//     `complete_authentication` manually and we no longer need the listener).
//
// We deliberately don't use express / fastify here — Node's built-in `http`
// module is tiny, has zero install footprint, and handles single-route
// listening fine.
// ─────────────────────────────────────────────────────────────────────────────

import { createServer, type Server } from "node:http";

export interface CallbackResult {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

export interface CallbackListenerHandle {
  /** Resolves on the first valid callback hit; rejects on error / timeout. */
  promise: Promise<CallbackResult>;
  /** Tear the listener down early (e.g. operator finished auth manually). */
  cancel: () => void;
}

/**
 * Spin up a single-shot HTTP listener on 127.0.0.1:<port> that accepts
 * exactly one request to `/callback` and returns the parsed querystring.
 */
export function listenForCallback(
  port: number,
  timeoutMs: number = 5 * 60 * 1000
): CallbackListenerHandle {
  let server: Server | null = null;
  let resolved = false;
  let resolveFn: ((r: CallbackResult) => void) | null = null;
  let rejectFn: ((e: Error) => void) | null = null;

  const promise = new Promise<CallbackResult>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  // Always best-effort close the underlying socket so we never leak listeners.
  const cleanup = (): void => {
    if (server) {
      try {
        server.close();
      } catch {
        // already closed — ignore
      }
      server = null;
    }
  };

  // Bail out if the user never returns. Time budget is generous on purpose:
  // tenants frequently chain SSO providers that themselves prompt for 2FA.
  const timer = setTimeout(() => {
    if (!resolved) {
      resolved = true;
      cleanup();
      rejectFn?.(
        new Error(`OAuth callback timed out after ${timeoutMs / 1000}s`)
      );
    }
  }, timeoutMs);

  server = createServer((req, res) => {
    // Late callback after we've already finished — politely refuse.
    if (resolved) {
      res.writeHead(503).end("listener closed");
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    if (url.pathname !== "/callback") {
      res.writeHead(404).end("not found");
      return;
    }

    // Pull both success and error parameters — the IdP uses the same redirect
    // for both outcomes per RFC 6749 §4.1.2.1.
    const code = url.searchParams.get("code") ?? undefined;
    const state = url.searchParams.get("state") ?? undefined;
    const error = url.searchParams.get("error") ?? undefined;
    const errorDescription =
      url.searchParams.get("error_description") ?? undefined;

    // Minimal feedback page so the user knows it worked and can close the tab.
    const html = error
      ? `<!doctype html><html><body style="font-family:system-ui;padding:2rem">
<h1>Authentication failed</h1>
<p><code>${escapeHtml(error)}</code></p>
${errorDescription ? `<p>${escapeHtml(errorDescription)}</p>` : ""}
<p>You can close this tab.</p></body></html>`
      : `<!doctype html><html><body style="font-family:system-ui;padding:2rem">
<h1>Authenticated ✓</h1>
<p>You can close this tab and return to your IDE.</p>
<p style="color:#666;font-size:0.9rem">outsystems-mcp-extended</p></body></html>`;

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html);

    resolved = true;
    clearTimeout(timer);
    cleanup();
    resolveFn?.({ code, state, error, errorDescription });
  });

  // EADDRINUSE / EACCES surface here; reject the promise so the caller can
  // tell the user why the listener didn't come up.
  server.on("error", (err) => {
    if (!resolved) {
      resolved = true;
      clearTimeout(timer);
      cleanup();
      rejectFn?.(err);
    }
  });

  server.listen(port, "127.0.0.1");

  return {
    promise,
    cancel: () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        cleanup();
        rejectFn?.(new Error("cancelled"));
      }
    },
  };
}

/** Minimal HTML escaping for the inline status page. */
function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (
        {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        } as Record<string, string>
      )[c] ?? c
  );
}
