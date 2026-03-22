/**
 * Boot a ke store from pragma.config.json sources.
 *
 * Reads configuration, resolves sources (defaults or overridden),
 * creates the store with registered prefixes, and wraps errors.
 *
 * @note Impure — reads filesystem, creates ke store.
 * @see CF.01, CF.02 in B.08.CONFIG
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { SourceSpec, Store } from "@canonical/ke";
import { createStore } from "@canonical/ke";
import type { PragmaConfig } from "../../config.js";
import { PragmaError } from "../../error/index.js";
import { PREFIX_MAP } from "./prefixes.js";

const require = createRequire(import.meta.url);

/**
 * Source package definitions — each entry maps a package name to the glob
 * patterns (relative to its package root) that contain TTL data.
 *
 * @see CF.02
 */
const SOURCE_PACKAGES = [
  {
    pkg: "@canonical/design-system",
    globs: ["definitions/ontology.ttl", "data/**/*.ttl"],
  },
  {
    pkg: "@canonical/anatomy-dsl",
    globs: ["definitions/**/*.ttl"],
  },
  {
    pkg: "@canonical/code-standards",
    globs: ["definitions/**/*.ttl", "data/**/*.ttl"],
  },
] as const;

/**
 * Resolve default TTL sources by locating each package via require.resolve.
 * This is package-manager agnostic — works with bun, npm, pnpm, and yarn
 * regardless of hoisting strategy.
 */
export function defaultSources(): SourceSpec[] {
  const sources: SourceSpec[] = [];

  for (const { pkg, globs } of SOURCE_PACKAGES) {
    let pkgDir: string;
    try {
      pkgDir = dirname(require.resolve(`${pkg}/package.json`));
    } catch {
      continue; // package not installed — skip
    }
    for (const glob of globs) {
      sources.push(join(pkgDir, glob));
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
        recovery:
          "Ensure design system packages are installed: bun add -D @canonical/design-system @canonical/code-standards @canonical/anatomy-dsl",
      },
    );
  }
}
