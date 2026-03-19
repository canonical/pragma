/**
 * Boot a ke store from pragma.config.toml sources.
 *
 * Reads configuration, resolves sources (defaults or overridden),
 * creates the store with registered prefixes, and wraps errors.
 *
 * @note Impure — reads filesystem, creates ke store.
 */

import type { SourceSpec, Store } from "@canonical/ke";
import { createStore } from "@canonical/ke";
import type { PragmaConfig } from "../../../config.js";
import { PragmaError } from "../../../error/index.js";
import { PREFIX_MAP } from "./prefixes.js";

/**
 * Default TTL source patterns when pragma.config.toml has no `sources` field.
 *
 * These globs point at the published ontology and data packages installed
 * in node_modules. They are used as the fallback when the user has not
 * configured explicit `sources` in their pragma.config.toml.
 */
export const DEFAULT_SOURCES: readonly string[] = [
  "node_modules/@canonical/ds-global/definitions/ontology.ttl",
  "node_modules/@canonical/ds-global/data/**/*.ttl",
  "node_modules/@canonical/anatomy-dsl/ontology/**/*.ttl",
  "node_modules/@canonical/code-standards/definitions/**/*.ttl",
  "node_modules/@canonical/code-standards/data/**/*.ttl",
];

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
  const sources = options.sources ?? [...DEFAULT_SOURCES];

  try {
    const store = await createStore({
      sources,
      prefixes: PREFIX_MAP,
      cache: options.cache,
    });
    return store;
  } catch (error) {
    throw PragmaError.storeError(
      error instanceof Error ? error.message : String(error),
      {
        recovery:
          "Ensure design system packages are installed: bun add -D @canonical/ds-global @canonical/code-standards",
      },
    );
  }
}
