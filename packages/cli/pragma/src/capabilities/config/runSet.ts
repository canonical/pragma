/**
 * The `config set <key> <value>` write body (lazily imported, off the fast path).
 *
 * `config set` is the ONLY config setter. It resolves `<key>` to its
 * {@link ConfigFieldSpec} row, honours that row's reset sentinels, re-validates
 * an enum value, and writes the global layer through the kernel
 * `writeConfigField`. An unknown key, and an out-of-set enum value, are backstop
 * INVALID_INPUTs — the CLI `coerceParam` and the MCP zod schema already reject a
 * non-member before `run`, but a direct call (a test, a future caller) must not
 * slip an invalid value to disk.
 *
 * THIS USED TO BE TWO FUNCTIONS ACROSS TWO FILES, and the seam between them was
 * scaffolding from the retired per-field setters (`config tier`, `config
 * channel`, `config detail`), each of which had its own positional name.
 * `runSet` re-keyed `params.value` under the row's `positional` string purely so
 * `runField` — its only caller — could read it straight back out. With one
 * setter there is one param bag, so the round trip and the `positional` field
 * that existed to serve it are both gone.
 */

import { map, type Task } from "@canonical/task";
import { writeConfigField } from "../../kernel/config/writeConfigField.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { CONFIG_FIELDS } from "./fields.js";
import type { ConfigFieldResult } from "./types.js";

/**
 * Build the Task that writes (or resets) the config field named by `<key>`.
 *
 * @param params - The coerced param bag: `key` (field name) and `value`.
 * @returns A Task yielding the write outcome.
 * @throws PragmaError INVALID_INPUT for an unknown key, or for an out-of-set
 *   enum value (both backstops).
 */
export function runSet(
  params: Record<string, unknown>,
): Task<ConfigFieldResult> {
  const key = String(params.key ?? "");
  const spec = CONFIG_FIELDS.find((field) => field.field === key);
  if (!spec) {
    throw PragmaError.invalidInput("key", key, {
      validOptions: CONFIG_FIELDS.map((field) => field.field),
    });
  }

  const value = String(params.value ?? "");

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
