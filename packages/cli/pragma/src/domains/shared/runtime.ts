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
import {
  type PackageRef,
  parsePackageEntry,
  type RawPackageEntry,
} from "../refs/operations/parseRef.js";
import readGlobalRefs from "../refs/operations/readGlobalRefs.js";
import { bootStore } from "./bootStore.js";
import { DEFAULT_PACKAGES } from "./packages.js";
import type { PragmaRuntime } from "./types/index.js";

export type { PragmaRuntime } from "./types/index.js";

/**
 * Create a fully initialized `PragmaRuntime`.
 *
 * Reads config from `cwd` (defaults to `process.cwd()`), merges global
 * and project package refs, boots the ke store from resolved sources,
 * and returns a runtime ready for operation calls.
 *
 * The caller owns the lifecycle and must call `dispose()`.
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

  // Merge package refs: project overrides global, both override defaults.
  const refs = options?.sources
    ? undefined
    : mergeAndParseRefs(config.packages);

  const store = await bootStore({
    cwd,
    sources: options?.sources,
    refs,
  });

  return {
    store,
    config,
    cwd,
    dispose: () => store.dispose(),
  };
}

// ---------------------------------------------------------------------------
// Ref merging
// ---------------------------------------------------------------------------

/**
 * Merge global refs, project config packages, and defaults into a final
 * parsed PackageRef array.
 *
 * Priority: project packages > global refs > hardcoded defaults.
 * Merging is by package name — a project entry for "@canonical/foo"
 * overrides the global entry for the same package.
 */
function mergeAndParseRefs(
  projectPackages?: ReadonlyArray<RawPackageEntry>,
): PackageRef[] {
  const globalEntries = readGlobalRefs();

  // If neither project nor global defines packages, return undefined
  // so resolvePackages() uses hardcoded defaults.
  if (
    (!projectPackages || projectPackages.length === 0) &&
    globalEntries.length === 0
  ) {
    return DEFAULT_PACKAGES.map((pkg) => parsePackageEntry(pkg));
  }

  // Build a name → entry map, global first, project overrides.
  const merged = new Map<string, RawPackageEntry>();

  // Start with defaults (lowest priority)
  for (const pkg of DEFAULT_PACKAGES) {
    merged.set(pkg, pkg);
  }

  // Global overrides defaults
  for (const entry of globalEntries) {
    const name = typeof entry === "string" ? entry : entry.name;
    merged.set(name, entry);
  }

  // Project overrides global
  if (projectPackages) {
    // When project explicitly declares packages, it's a full replacement
    // of the package list — clear defaults and global, use project only.
    merged.clear();
    for (const entry of projectPackages) {
      const name = typeof entry === "string" ? entry : entry.name;
      merged.set(name, entry);
    }
  }

  return [...merged.values()].map(parsePackageEntry);
}
