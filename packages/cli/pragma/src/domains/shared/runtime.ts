/**
 * Unified boot path for pragma CLI, MCP, and completions server.
 *
 * `bootPragma()` is the single factory function that creates a
 * `PragmaRuntime`. All three surfaces (CLI, MCP, completions) call it
 * instead of manually assembling store + config.
 *
 * @note Impure — reads config from filesystem and boots ke store (WASM + TTL).
 */

import type { SourceSpec } from "@canonical/ke";
import { readConfig } from "#config";
import { bootStore } from "./bootStore.js";
import type { PragmaRuntime } from "./types/index.js";

export type { PragmaRuntime } from "./types/index.js";

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
