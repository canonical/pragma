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
 * effect model expresses.
 */

import { dirname } from "node:path";
import {
  $,
  exists,
  gen,
  mkdir,
  readFile,
  type Task,
  writeFile,
} from "@canonical/task";
import { globalConfigPath } from "./paths.js";
import type { RawConfig } from "./types.js";

/** The result of a global-config write. */
export interface WriteConfigResult {
  readonly path: string;
  readonly field: string;
}

/**
 * Build the Task that sets (or removes) one global config field.
 *
 * @param field - The config field to write.
 * @param value - The new value, or `undefined` to remove the field.
 * @returns A Task yielding the written path and field name.
 */
export function writeConfigField(
  field: keyof RawConfig,
  value: unknown,
): Task<WriteConfigResult> {
  return gen(function* () {
    const path = globalConfigPath();

    let current: Record<string, unknown> = {};
    if (yield* $(exists(path))) {
      const raw = yield* $(readFile(path));
      try {
        current = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        current = {};
      }
    }

    const next = { ...current };
    if (value === undefined) {
      delete next[field];
    } else {
      next[field] = value;
    }

    yield* $(mkdir(dirname(path), true));
    yield* $(writeFile(path, `${JSON.stringify(next, null, 2)}\n`));
    return { path, field };
  });
}
