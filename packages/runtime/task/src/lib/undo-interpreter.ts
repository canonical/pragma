/**
 * Undo Interpreter
 *
 * The third interpreter for the Task effect framework, alongside
 * `runTask` (production) and `dryRun` (preview).
 *
 * Given a task, `runUndo` walks the task tree with mocked forward effects
 * (like dryRun), collects all `undo` tasks attached to effects, then
 * executes them in reverse order (LIFO).
 *
 * This enables `--undo` on any CLI command without storing state:
 * the same task definition + same answers = deterministic undo.
 */

import { driveSync } from "./driveSync.js";
import { mockEffectWithFs } from "./dry-run.js";
import { type RunTaskOptions, runTask } from "./interpreter.js";
import type { Effect, Task } from "./types.js";

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

/**
 * Collect undo tasks from a task tree without executing any effects.
 * Forward effects are mocked (same as dryRun). Only the `undo` field
 * on each effect is collected.
 *
 * @param task - The task to collect undos from
 * @returns Array of undo tasks in forward execution order
 */
export const collectUndos = <A>(task: Task<A>): Task<void>[] => {
  const undos: Task<void>[] = [];
  // Track virtual filesystem state for exists() checks (same as dryRun).
  collectUndosInto(task as Task<unknown>, new Set(), undos);
  return undos;
};

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Walk a task tree with mocked forward effects over a shared virtual
 * filesystem, appending each effect's `undo` task (in forward order) to
 * `undos`. `Parallel`/`Race` children are walked against the same `virtualFs`.
 * The forward walk is trampolined via {@link driveSync}, so deep chains stay
 * stack-safe.
 *
 * @param task - The task to collect undos from.
 * @param virtualFs - Shared set of paths created so far during the walk.
 * @param undos - Accumulator appended in forward execution order.
 * @note Impure — mutates the shared `virtualFs` set and `undos` accumulator.
 */
const collectUndosInto = (
  task: Task<unknown>,
  virtualFs: Set<string>,
  undos: Task<void>[],
): void => {
  const resolveEffect = (effect: Effect): unknown => {
    if ("undo" in effect && effect.undo) {
      undos.push(effect.undo);
    }

    if (effect._tag === "Parallel") {
      return effect.tasks.map((child) => {
        collectUndosInto(child, virtualFs, undos);
        return undefined;
      });
    }

    if (effect._tag === "Race") {
      const first = effect.tasks.at(0);
      if (first !== undefined) {
        collectUndosInto(first, virtualFs, undos);
      }
      return mockEffectWithFs(effect, virtualFs);
    }

    return mockEffectWithFs(effect, virtualFs);
  };

  driveSync(task, resolveEffect);
};
