// ─────────────────────────────────────────────────────────────────────────────
// PendingAuthStore — holds in-flight OAuth state between `authenticate` and
// either the local callback arrival or a `complete_authentication` follow-up.
//
// We can only have one pending OAuth attempt at a time: a new `authenticate`
// call cancels any prior in-flight flow (closing its callback listener) so
// the user doesn't accumulate orphaned listeners on the loopback port.
//
// The cleanup callback (if provided) is invoked from `clear()` — typically it
// shuts down the callback listener so the port is freed promptly.
// ─────────────────────────────────────────────────────────────────────────────

import type { PendingAuth } from "./oauth.js";

export class PendingAuthStore {
  private current: PendingAuth | null = null;
  private cleanup: (() => void) | null = null;

  /**
   * Replace any existing pending state with a new one, running the previous
   * attempt's cleanup callback first so we don't leak listeners.
   */
  set(p: PendingAuth, cleanup?: () => void): void {
    this.clear();
    this.current = p;
    this.cleanup = cleanup ?? null;
  }

  /** Current pending OAuth attempt, or null. */
  get(): PendingAuth | null {
    return this.current;
  }

  /**
   * Tear down the pending attempt. Safe to call repeatedly — cleanup errors
   * are swallowed because there's nothing useful for the caller to do with
   * them at this point.
   */
  clear(): void {
    if (this.cleanup) {
      try {
        this.cleanup();
      } catch {
        // best-effort cleanup — the listener may already be closed
      }
      this.cleanup = null;
    }
    this.current = null;
  }
}
