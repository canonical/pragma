/**
 * The config write bodies (lazily imported, off the fast path).
 *
 * {@link runField} resolves the single positional and composes the write as a
 * Task over the kernel `writeConfigField` (global-layer only). An enum field
 * re-validates its value as a belt-and-braces backstop — the CLI `coerceParam`
 * and the MCP zod schema already reject a non-member before `run`, but a
 * direct call (a test, a future caller) must not slip an invalid value to
 * disk. Clearing a field is its own verb ({@link runUnset}); the values that
 * used to double as clear-markers are refused with the verb named.
 */

import { map, type Task } from "@canonical/task";
import { writeConfigField } from "../../kernel/config/index.js";
import { cliRecovery, PragmaError } from "../../kernel/error/index.js";
import { type ConfigFieldSpec, RESERVED_CLEAR_VALUES } from "./fields.js";
import type { ConfigFieldResult } from "./types.js";

/**
 * Build the Task that writes one config field.
 *
 * @param spec - The field-table row for the target field.
 * @param params - The coerced param bag (carries the single positional).
 * @returns A Task yielding the write outcome.
 * @throws PragmaError INVALID_INPUT for an out-of-set enum value (backstop),
 *   or for a reserved clear-marker on a free-string field — clearing is
 *   `config unset <key>`'s job, and the error names it.
 */
export function runField(
  spec: ConfigFieldSpec,
  params: Record<string, unknown>,
): Task<ConfigFieldResult> {
  const value = String(params[spec.positional] ?? "");

  if (spec.kind === "string" && RESERVED_CLEAR_VALUES.includes(value)) {
    throw PragmaError.invalidInput(spec.field, value, {
      recovery: cliRecovery(
        `config unset ${spec.field}`,
        "Clear the field with the unset command.",
        // The agent's half of the same instruction — the tool's `key` is the
        // field this run body already holds.
        { tool: "config_unset", params: { key: spec.field } },
      ),
    });
  }

  if (spec.kind === "enum" && !(spec.values ?? []).includes(value)) {
    throw PragmaError.invalidInput(spec.field, value, {
      validOptions: [...(spec.values ?? [])],
    });
  }

  return map(
    writeConfigField(spec.field, value),
    (result): ConfigFieldResult => ({
      field: result.field,
      value,
      path: result.path,
      reset: false,
    }),
  );
}

/**
 * Build the Task that clears one config field — removes it from the global
 * layer so the built-in default (or a project config) applies again.
 *
 * @param spec - The field-table row for the target field.
 * @returns A Task yielding the reset outcome.
 */
export function runUnset(spec: ConfigFieldSpec): Task<ConfigFieldResult> {
  return map(
    writeConfigField(spec.field, undefined),
    (result): ConfigFieldResult => ({
      field: result.field,
      path: result.path,
      reset: true,
    }),
  );
}
