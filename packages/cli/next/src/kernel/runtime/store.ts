/**
 * The lazy store — the ONE guarded factory the storeless-guarantee spy targets.
 *
 * `get()` dynamic-imports the heavy session loader, so constructing a runtime —
 * or importing any capability — never pulls ke/ke-graphql/oxigraph. The
 * dispatcher calls `get()` only for `capability.needsStore` verbs, which is what
 * makes the storeless guarantee hold by construction: a storeless verb has no
 * path to the store factory, so `booted` stays false.
 *
 * Memoization WITH invalidation — the store is long-lived (the MCP server boots
 * ONE runtime for its whole lifetime and shares it across every tool call), not
 * one-shot:
 *
 * - A SUCCESSFUL boot is memoized (the session is immutable until invalidated).
 *   A REJECTED boot is NOT: a cold store throws STORE_UNAVAILABLE from the
 *   loader, and `get()` clears the memo before re-throwing so a later `get()`
 *   retries from scratch. This matters precisely because the server is
 *   long-lived: an agent that hits STORE_UNAVAILABLE can run `sources update`
 *   (which builds the pack on disk) and retry — something DID change to make the
 *   retry succeed, so memoizing the rejection would strand the session forever.
 *   For a one-shot CLI (a single `get()` per process) clearing the memo on
 *   failure is a harmless no-op.
 * - `invalidate()` drops the memoized session so the next `get()` re-boots
 *   against the current on-disk pack. Because boot reads config through
 *   `ctx.loadConfig` (which is itself memoized upstream), invalidating the store
 *   must also drop that config memo — otherwise a re-boot would reuse stale
 *   config. `onInvalidate` is the hook the runtime wires for exactly that (it
 *   clears the boot-level `configPromise`). The MCP projector calls
 *   `invalidate()` after every real mutation so a `config_set`/`sources update`
 *   becomes visible to the next read tool.
 */

import type { ConfigLayers } from "../config/types.js";
import type { LazyStore, StoreSession } from "./types.js";

/** What the lazy store needs to boot: a cwd and a memoized config loader. */
export interface LazyStoreContext {
  readonly cwd: string;
  readonly loadConfig: () => Promise<ConfigLayers>;
  /**
   * Called by `invalidate()` after the store memo is dropped, so the runtime can
   * also drop the sibling caches this store's boot depends on (the memoized
   * config `loadConfig` resolves) — a re-boot must not reuse stale config.
   */
  readonly onInvalidate?: () => void;
}

/**
 * Create a lazy store handle.
 *
 * @param ctx - The working directory, memoized config loader, and optional
 *   invalidation hook.
 * @returns The lazy store: a `get()` that memoizes a successful boot (never a
 *   rejection), a `booted` flag, and an `invalidate()` reset.
 */
export function createLazyStore(ctx: LazyStoreContext): LazyStore {
  let session: Promise<StoreSession> | undefined;
  let booted = false;

  return {
    get booted(): boolean {
      return booted;
    },
    get(): Promise<StoreSession> {
      if (session === undefined) {
        session = (async () => {
          try {
            const { loadStoreSession } = await import("./loadSession.js");
            const loaded = await loadStoreSession(ctx);
            booted = true;
            return loaded;
          } catch (err) {
            // Clear the memo BEFORE the rejection propagates (inside the async
            // IIFE, so there is no window where a concurrent caller adopts the
            // rejected promise): the next `get()` retries a fresh boot, which a
            // `sources update` between calls can make succeed.
            session = undefined;
            throw err;
          }
        })();
      }
      return session;
    },
    invalidate(): void {
      session = undefined;
      booted = false;
      ctx.onInvalidate?.();
    },
  };
}
