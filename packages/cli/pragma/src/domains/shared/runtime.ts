/**
 * Unified boot path for pragma CLI, MCP, and completions server.
 *
 * `PragmaRuntime` encapsulates all boot-time state (store, config, cwd).
 * `bootPragma()` is the single factory function that creates it. All three
 * surfaces (CLI, MCP, completions) call `bootPragma()` instead of manually
 * assembling store + config.
 *
 * @note Impure — reads config from filesystem and boots ke store (WASM + TTL).
 */

import type { SourceSpec, Store } from "@canonical/ke";
import { type PragmaConfig, readConfig } from "#config";
import { bootStore } from "./bootStore.js";

/**
 * Boot-time state shared by CLI, MCP, and completions server.
 *
 * Four members:
 * - `store` — the ke triple store, loaded and ready for SPARQL queries.
 * - `config` — resolved pragma config (tier, channel).
 * - `cwd` — working directory used for config and source resolution.
 * - `dispose()` — tears down the store and frees WASM memory. Must be
 *   called exactly once; calling operations after dispose is undefined.
 */
export interface PragmaRuntime {
  readonly store: Store;
  readonly config: PragmaConfig;
  readonly cwd: string;
  dispose(): void;
}

/**
 * Create a fully initialized `PragmaRuntime`.
 *
 * Reads config from `cwd` (defaults to `process.cwd()`), boots the ke
 * store from resolved sources, and returns a runtime ready for operation
 * calls. The caller owns the lifecycle and must call `dispose()`.
 *
 * @param options.cwd - Working directory for config and source resolution.
 * @param options.sources - Override sources for testing (skip filesystem resolution).
 * @throws PragmaError with code CONFIG_ERROR if config is invalid.
 * @throws PragmaError with code STORE_ERROR if store fails to initialize.
 */
export async function bootPragma(options?: {
  cwd?: string;
  sources?: SourceSpec[];
}): Promise<PragmaRuntime> {
  const cwd = options?.cwd ?? process.cwd();
  const config = readConfig(cwd);
  const store = await bootStore({
    cwd,
    sources: options?.sources,
  });

  return {
    store,
    config,
    cwd,
    dispose: () => store.dispose(),
  };
}
