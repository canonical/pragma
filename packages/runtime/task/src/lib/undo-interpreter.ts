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
// Undo Interpreter
// =============================================================================

/**
 * Walk a task tree, mock all forward effects, collect undo tasks,
 * then execute them in reverse (LIFO) order.
 *
 * @param task - The task to undo (same task that was originally run forward)
 * @param options - RunTaskOptions passed to the undo execution phase
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
  // Phase 1: Walk the task tree with mocked effects, collect undos
  const undos = collectUndos(task);

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
