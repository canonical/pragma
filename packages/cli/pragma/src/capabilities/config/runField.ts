/**
 * The `config <field>` write body (lazily imported, off the fast path).
 *
 * Resolves the single positional and composes the write as a Task over the
 * kernel `writeConfigField` (global-layer only): a reset sentinel removes the
 * field (`writeConfigField(field, undefined)`), otherwise the value is written.
 * An enum field re-validates its value as a belt-and-braces backstop — the CLI
 * `coerceParam` and the MCP zod schema already reject a non-member before `run`,
 * but a direct call (a test, a future caller) must not slip an invalid value to
 * disk.
 */

import { map, type Task } from "@canonical/task";
import { writeConfigField } from "../../kernel/config/writeConfigField.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { ConfigFieldSpec } from "./fields.js";
import type { ConfigFieldResult } from "./types.js";

/**
 * Build the Task that writes (or resets) one config field.
 *
 * @param spec - The field-table row for the target field.
 * @param params - The coerced param bag (carries the single positional).
 * @returns A Task yielding the write outcome.
 * @throws PragmaError INVALID_INPUT for an out-of-set enum value (backstop).
 */
export function runField(
  spec: ConfigFieldSpec,
  params: Record<string, unknown>,
): Task<ConfigFieldResult> {
  const value = String(params[spec.positional] ?? "");

  if (spec.resetSentinel?.includes(value)) {
    return map(
      writeConfigField(spec.field, undefined),
      (result): ConfigFieldResult => ({
        field: result.field,
        path: result.path,
        reset: true,
      }),
    );
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
