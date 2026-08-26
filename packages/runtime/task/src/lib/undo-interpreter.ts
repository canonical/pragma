/**
 * Undo Interpreter
 *
 * The third interpreter for the Task effect framework, alongside
 * `runTask` (production) and `dryRun` (preview).
 *
 * Given a task, `runUndo` collects all `undo` tasks attached to effects
 * (via the node-free `collectUndos` walk in `undo.js`), then executes them
 * in reverse order (LIFO) against the host — which is why this module is
 * node-touching and ships from `@canonical/task/node`.
 *
 * This enables `--undo` on any CLI command without storing state:
 * the same task definition + same answers = deterministic undo.
 */

import { existsSync } from "node:fs";
import * as path from "node:path";
import { type RunTaskOptions, runTask } from "./interpreter.js";
import type { Task } from "./types.js";
import { collectUndos } from "./undo.js";

// =============================================================================
// Undo Result
// =============================================================================

export interface UndoResult {
  /** Number of undo tasks that were collected and executed */
  undoCount: number;
}

// =============================================================================
// Host-state resolution
// =============================================================================

/**
 * Build the `resolveExists` resolver `runUndo` collects with: `Exists`
 * effects consult the real filesystem, resolving relative paths the same way
 * the production interpreter does (`path.resolve(cwd, p)` when `cwd` is set,
 * verbatim otherwise — i.e. against `process.cwd()`).
 *
 * Exported so callers that *display* an undo plan (e.g. `--undo --dry-run`)
 * can collect with identical semantics to what `runUndo` will execute —
 * collecting without it resolves every pre-existing path as absent and can
 * show (or run) the wrong branch's undos.
 *
 * @param cwd - Base directory relative effect paths resolve against.
 * @returns A resolver suitable for `collectUndos`' `resolveExists` option.
 */
export const hostExistsResolver =
  (cwd?: string): ((p: string) => boolean) =>
  (p: string): boolean =>
    existsSync(cwd ? path.resolve(cwd, p) : p);

// =============================================================================
// Undo Interpreter
// =============================================================================

/**
 * Walk a task tree, mock all forward effects, collect undo tasks,
 * then execute them in reverse (LIFO) order.
 *
 * The collection walk resolves `Exists` effects against the real filesystem
 * (via {@link hostExistsResolver}), so a task that branches on pre-existing
 * host state — `ifElseM(exists(p), append, create)` — collects the undos of
 * the branch its forward run actually took, not the branch a blank
 * filesystem would imply. `ReadFile` stays mocked by design; see
 * `CollectUndosOptions.resolveExists` for the rationale.
 *
 * @param task - The task to undo (same task that was originally run forward)
 * @param options - RunTaskOptions passed to the undo execution phase; `cwd`
 *   also anchors the collection walk's `Exists` resolution
 * @returns The number of undo steps executed
 *
 * @example
 * ```typescript
 * // Forward run:
 * await runTask(generator.generate(answers));
 *
 * // Undo (later, with same answers):
 * await runUndo(generator.generate(answers));
 * ```
 */
export const runUndo = async <A>(
  task: Task<A>,
  options?: RunTaskOptions,
): Promise<UndoResult> => {
  // Phase 1: Walk the task tree with mocked effects, collect undos.
  // Exists resolves against the host so branch selection matches the run
  // being undone.
  const undos = collectUndos(task, {
    resolveExists: hostExistsResolver(options?.cwd),
  });

  if (undos.length === 0) {
    return { undoCount: 0 };
  }

  // Phase 2: Execute collected undos in reverse (LIFO)
  // Import sequence_ inline to avoid circular dependency
  const reversed = undos.reverse();
  for (const undoTask of reversed) {
    await runTask(undoTask, options);
  }

  return { undoCount: reversed.length };
};
