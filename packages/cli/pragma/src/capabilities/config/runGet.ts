/**
 * The `config get <key>` read body (lazily imported, off the fast path).
 *
 * Reads the layered config and projects the one requested field with the
 * layer that supplied it — the same resolution `config show` reports, scoped
 * to a single value.
 */

import { readConfig } from "../../kernel/config/readConfig.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { resolveFieldSpec } from "./runSet.js";
import type { ConfigGetData } from "./types.js";

/**
 * Resolve one config field's effective value and provenance.
 *
 * @param params - The coerced param bag carrying `key`.
 * @param runtime - The per-invocation runtime (its cwd anchors the layering).
 * @returns The field, its resolved value (absent when unset), and its source.
 * @note Impure — reads the config layers from disk.
 */
export async function runGet(
  params: Record<string, unknown>,
  runtime: PragmaRuntime,
): Promise<ConfigGetData> {
  const spec = resolveFieldSpec(params);
  const layers = await readConfig(runtime.cwd);
  const value = layers.config[spec.field];
  return {
    field: spec.field,
    ...(value === undefined ? {} : { value }),
    source: layers.origins[spec.field],
  };
}
