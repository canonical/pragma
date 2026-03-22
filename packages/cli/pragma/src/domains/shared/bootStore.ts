/**
 * Boot a ke store from pragma.config.json sources.
 *
 * Reads configuration, resolves sources (defaults or overridden),
 * creates the store with registered prefixes, and wraps errors.
 *
 * @note Impure — reads filesystem, creates ke store.
 * @see CF.01, CF.02 in B.08.CONFIG
 */

import { join } from "node:path";
import type { SourceSpec, Store } from "@canonical/ke";
import { createStore } from "@canonical/ke";
import type { PragmaConfig } from "#config";
import { PragmaError } from "../../error/index.js";
import { PACKAGES, resolvePackages } from "./packages.js";
import { PREFIX_MAP } from "./prefixes.js";

/**
 * Resolve default TTL sources from the package registry.
 * Package-manager agnostic — works with bun, npm, pnpm, and yarn.
 *
 * @see CF.02
 */
export function defaultSources(): SourceSpec[] {
  const sources: SourceSpec[] = [];
  const resolved = resolvePackages();

  for (const { pkg, dir } of resolved) {
    const def = PACKAGES.find((p) => p.pkg === pkg);
    if (!def) continue;
    for (const glob of def.ttl) {
      sources.push(join(dir, glob));
    }
  }

  return sources;
}

export interface BootStoreOptions {
  /** Override config (skip reading from disk). */
  config?: PragmaConfig;
  /** Override sources (skip config sources field). */
  sources?: SourceSpec[];
  /** Working directory for resolving relative paths. */
  cwd?: string;
  /** Cache path for serialized store. */
  cache?: string;
}

/**
 * Boot a ke store from configuration.
 *
 * @throws PragmaError with code STORE_ERROR on failure.
 */
export async function bootStore(
  options: BootStoreOptions = {},
): Promise<Store> {
  const sources = options.sources ?? defaultSources();

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
