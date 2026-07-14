/**
 * Regression: the preview interpreters must be stack-safe.
 *
 * Before the fix, only `runTask` was trampolined; `dryRun`, `collectEffects`,
 * and `collectUndos` walked the task tree recursively, so a deep `flatMap`/`gen`
 * chain overflowed the call stack (`RangeError`) under preview and undo even
 * though the same chain ran fine in production.
 */

import { describe, expect, it } from "vitest";
import { collectEffects, dryRun } from "../../lib/dry-run.js";
import { writeFile } from "../../lib/primitives.js";
import { flatMap, pure } from "../../lib/task.js";
import type { Task } from "../../lib/types.js";
import { collectUndos } from "../../lib/undo.js";

// A depth well beyond the native call-stack limit (~10k frames), so a recursive
// walk would overflow while a trampolined one completes.
const DEPTH = 100_000;

describe("regression 0002 — preview interpreters are stack-safe", () => {
  it("dryRun completes on a deep flatMap chain", () => {
    let task: Task<number> = pure(0);
    for (let i = 0; i < DEPTH; i++) {
      task = flatMap(task, (x) => pure(x + 1));
    }

    expect(dryRun(task).value).toBe(DEPTH);
  });

  it("collectEffects completes on a deep flatMap chain", () => {
    let task: Task<number> = pure(0);
    for (let i = 0; i < DEPTH; i++) {
      task = flatMap(task, (x) => pure(x + 1));
    }

    expect(collectEffects(task)).toEqual([]);
  });

  it("collectUndos completes on a deep chain of undoable effects", () => {
    let task: Task<unknown> = pure(undefined);
    for (let i = 0; i < DEPTH; i++) {
      task = flatMap(task, () => writeFile(`/virtual/file-${i}.txt`, "x"));
    }

    expect(collectUndos(task)).toHaveLength(DEPTH);
  });
});
