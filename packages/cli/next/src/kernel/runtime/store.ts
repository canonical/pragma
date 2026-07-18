/**
 * The lazy store — the ONE guarded factory the storeless-guarantee spy targets.
 *
 * `get()` is memoized (the store is immutable for the process's lifetime) and
 * dynamic-imports the heavy session loader, so constructing a runtime — or
 * importing any capability — never pulls ke/ke-graphql/oxigraph. The dispatcher
 * calls `get()` only for `capability.needsStore` verbs, which is what makes the
 * storeless guarantee hold by construction: a storeless verb has no path to the
 * store factory, so `booted` stays false. A cold store throws STORE_UNAVAILABLE
 * from the loader; the rejected promise is memoized (nothing changes within one
 * process to make a retry succeed).
 */

import type { ConfigLayers } from "../config/types.js";
import type { LazyStore, StoreSession } from "./types.js";

/** What the lazy store needs to boot: a cwd and a memoized config loader. */
export interface LazyStoreContext {
  readonly cwd: string;
  readonly loadConfig: () => Promise<ConfigLayers>;
}

/**
 * Create a lazy store handle.
 *
 * @param ctx - The working directory and memoized config loader.
 * @returns The lazy store: a memoized `get()` and a `booted` flag.
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
          const { loadStoreSession } = await import("./loadSession.js");
          const loaded = await loadStoreSession(ctx);
          booted = true;
          return loaded;
        })();
      }
      return session;
    },
  };
}
