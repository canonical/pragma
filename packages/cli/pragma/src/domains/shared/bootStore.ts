/**
 * Boot a ke store from pragma.config.json sources.
 *
 * Reads configuration, resolves sources (defaults or overridden),
 * creates the store with registered prefixes, and wraps errors.
 *
 * @note Impure — reads filesystem, creates ke store.
 */

import { join } from "node:path";
import type { SourceSpec, Store } from "@canonical/ke";
import { createStore } from "@canonical/ke";
import { PragmaError } from "../../error/index.js";
import type { PackageRef } from "../refs/operations/parseRef.js";
import { resolvePackages } from "./packages.js";
import { PREFIX_MAP } from "./prefixes.js";

/** Default TTL glob patterns — convention-based auto-detection. */
const DEFAULT_TTL_GLOBS: readonly string[] = [
  "definitions/**/*.ttl",
  "data/**/*.ttl",
];

/**
 * Resolve default TTL sources from resolved packages.
 *
 * Uses convention-based TTL discovery: definitions and data globs
 * relative to each package root.
 *
 * @param refs - Parsed package references. Omit for defaults.
 */
export function defaultSources(refs?: ReadonlyArray<PackageRef>): SourceSpec[] {
  const sources: SourceSpec[] = [];
  const resolved = resolvePackages(refs);

  for (const { dir } of resolved) {
    for (const glob of DEFAULT_TTL_GLOBS) {
      sources.push(join(dir, glob));
    }
  }

  return sources;
}

export interface BootStoreOptions {
  /** Override sources (skip filesystem resolution). */
  sources?: SourceSpec[];
  /** Working directory for resolving relative paths. */
  cwd?: string;
  /** Cache path for serialized store. */
  cache?: string;
  /** Parsed package references for ref-based resolution. */
  refs?: ReadonlyArray<PackageRef>;
}

/**
 * Boot a ke store from configuration.
 *
 * @throws PragmaError with code STORE_ERROR on failure.
 */
export async function bootStore(
  options: BootStoreOptions = {},
): Promise<Store> {
  const sources = options.sources ?? defaultSources(options.refs);

  try {
    const store = await createStore({
      sources,
      prefixes: PREFIX_MAP,
      cache: options.cache,
      cwd: options.cwd,
    });
    return store;
  } catch (error) {
    throw PragmaError.storeError(
      error instanceof Error ? error.message : String(error),
      {
        recovery: {
          message:
            "Ensure design system packages are installed: bun add -D @canonical/design-system @canonical/code-standards @canonical/anatomy-dsl",
        },
      },
    );
  }
}
