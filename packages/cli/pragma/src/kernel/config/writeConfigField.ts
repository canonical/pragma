/**
 * Write a single field into the global config, as a Task.
 *
 * A mutation, so it lives on the effect seam: `writeConfigField` returns a
 * `Task` the dispatcher interprets (node interpreter to apply, dry-run to
 * preview). It merges the field into the existing global document — a value of
 * `undefined` removes it — and writes the whole document back. Only the global
 * layer is writable; project configs are authored by hand.
 *
 * The Task effect vocabulary has no rename effect, so the write is a single
 * `WriteFile` (the interpreter creates the parent dir) rather than the
 * temp-file-plus-rename the v1 sync writer used — the closest atomicity the
 * effect model expresses. If the existing file is corrupt (unparseable), it is
 * backed up to a timestamped sibling before the overwrite — consistent with the
 * read path (globalConfig) so a torn write is never silently discarded.
 */

import { dirname } from "node:path";
import {
  $,
  exists,
  gen,
  mkdir,
  readFile,
  type Task,
  warn,
  writeFile,
} from "@canonical/task";
import { corruptBackupPath } from "./globalConfig.js";
import { globalConfigPath } from "./paths.js";
import type { RawConfig } from "./types.js";

/** The result of a global-config write. */
export interface WriteConfigResult {
  readonly path: string;
  readonly field: string;
  /**
   * The field's prior value (as a string), or `undefined` when it was absent.
   * Lets the recap report `old → new` and distinguish a real change from a
   * no-op.
   */
  readonly previous: string | undefined;
  /**
   * Whether the write actually changed the field. False when the new value
   * equals the current one (or a reset removes an already-absent field) — in
   * that case NO `WriteFile` is composed, so a re-set of the same value is a
   * true no-op.
   */
  readonly changed: boolean;
}

/** A stored config value coerced to the string form the CLI compares/reports. */
const asDisplayString = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : String(value);

/**
 * Build the Task that sets (or removes) one global config field.
 *
 * Detects the field's current value first and GATES the write on an actual
 * change: setting a field to the value it already holds (or resetting a field
 * already absent) composes no `WriteFile`, so a no-op re-set never churns the
 * file. A corrupt existing config is a real change (it must be repaired), so it
 * still writes after backing up.
 *
 * @param field - The config field to write.
 * @param value - The new value, or `undefined` to remove the field.
 * @returns A Task yielding the path, field, prior value, and `changed` flag.
 */
export function writeConfigField(
  field: keyof RawConfig,
  value: unknown,
): Task<WriteConfigResult> {
  return gen(function* () {
    const path = globalConfigPath();

    let current: Record<string, unknown> = {};
    let corrupt = false;
    if (yield* $(exists(path))) {
      const raw = yield* $(readFile(path));
      try {
        current = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        // Corrupt/torn existing config: preserve it in a timestamped backup and
        // warn (routed to stderr by the dispatcher's interpreter) before we
        // overwrite with defaults + the new field — never a silent discard.
        const backup = corruptBackupPath(path);
        yield* $(writeFile(backup, raw));
        yield* $(
          warn(`${path} was not valid JSON; backed it up to ${backup}.`),
        );
        current = {};
        corrupt = true;
      }
    }

    const previous = asDisplayString(current[field]);
    const wanted = asDisplayString(value);
    // Unchanged when the new value matches the current one (a repair of a
    // corrupt file always counts as changed, so it is rewritten).
    const changed = corrupt || previous !== wanted;
    if (!changed) {
      // True no-op: no WriteFile composed. The recap reports "unchanged".
      return { path, field, previous, changed: false };
    }

    const next = { ...current };
    if (value === undefined) {
      delete next[field];
    } else {
      next[field] = value;
    }

    yield* $(mkdir(dirname(path), true));
    yield* $(writeFile(path, `${JSON.stringify(next, null, 2)}\n`));
    return { path, field, previous, changed: true };
  });
}
