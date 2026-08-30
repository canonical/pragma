/**
 * The `config set <key> <value>` write body (lazily imported, off the fast path).
 *
 * `config set` is the single-command form of the per-field setters: it resolves
 * `<key>` to its {@link ConfigFieldSpec} and delegates to the SAME
 * {@link runField} write path, so reset sentinels, enum re-validation, and the
 * global-layer write all behave identically to `config <field>`. An unknown key
 * is a backstop INVALID_INPUT — the CLI enum coerce and the MCP schema already
 * reject a non-member first, but a direct call must not slip through.
 */

import type { Task } from "@canonical/task";
import { PragmaError } from "../../kernel/error/index.js";
import { CONFIG_FIELDS, type ConfigFieldSpec } from "./fields.js";
import { runField, runUnset as runFieldUnset } from "./runField.js";
import type { ConfigFieldResult } from "./types.js";

/**
 * Resolve `<key>` to its field-table row.
 *
 * @param params - The coerced param bag carrying `key`.
 * @returns The matching {@link ConfigFieldSpec}.
 * @throws PragmaError INVALID_INPUT for an unknown key (backstop — the CLI
 *   enum coerce and the MCP schema already reject a non-member first).
 */
export function resolveFieldSpec(
  params: Record<string, unknown>,
): ConfigFieldSpec {
  const key = String(params.key ?? "");
  const spec = CONFIG_FIELDS.find((field) => field.field === key);
  if (!spec) {
    throw PragmaError.invalidInput("key", key, {
      validOptions: CONFIG_FIELDS.map((field) => field.field),
    });
  }
  return spec;
}

/**
 * Build the Task that writes the config field named by `<key>`.
 *
 * @param params - The coerced param bag: `key` (field name) and `value`.
 * @returns A Task yielding the write outcome.
 */
export function runSet(
  params: Record<string, unknown>,
): Task<ConfigFieldResult> {
  const spec = resolveFieldSpec(params);
  // Re-key the value under the field's own positional (`path`/`name`/`level`) so
  // runField reads it exactly as the per-field verb would.
  return runField(spec, { [spec.positional]: String(params.value ?? "") });
}

/**
 * Build the Task that clears the config field named by `<key>`.
 *
 * @param params - The coerced param bag carrying `key`.
 * @returns A Task yielding the reset outcome.
 */
export function runUnset(
  params: Record<string, unknown>,
): Task<ConfigFieldResult> {
  return runFieldUnset(resolveFieldSpec(params));
}
