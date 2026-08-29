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
import { TaskExecutionError } from "./errors.js";
import { type RunTaskOptions, runTask } from "./interpreter.js";
import type { Task, TaskError, UndoTask } from "./types.js";
import { collectUndos } from "./undo.js";

// =============================================================================
// Undo Result
// =============================================================================

/**
 * How one collected undo ended — a discriminated union, so the type itself
 * enforces that a failed outcome always carries its cause and a successful
 * one never does: no consumer needs an "unknown cause" fallback, and no
 * producer can report a failure without saying what failed.
 *
 * `key` is the correlation key the undo's declaration supplied
 * (`UndoOptions.undoKey`), echoed verbatim — absent when the declaration
 * carried none. It is the ONLY correlation contract: outcomes are reported in
 * execution (LIFO) order, which is not the order a caller composed its
 * effects in, so reading them back by index is wrong by construction.
 */
export type UndoOutcome =
  | {
      /** Echoed from the undo declaration's `undoKey`, when it had one. */
      readonly key?: string;
      readonly status: "undone";
    }
  | {
      /** Echoed from the undo declaration's `undoKey`, when it had one. */
      readonly key?: string;
      readonly status: "failed";
      /** The structured failure — always present on a failed outcome. */
      readonly error: TaskError;
    };

export interface UndoResult {
  /**
   * Number of undo tasks that completed successfully — the honest count for
   * a "reversed N step(s)" line. Failures are not steps that were undone, so
   * they are excluded here and reported in `outcomes` instead; a caller that
   * wants "attempted" reads `outcomes.length`.
   */
  undoCount: number;
  /**
   * One entry per attempted undo, in execution (LIFO) order. A failed undo
   * does not abort the ones still pending — a reversal's job is to undo as
   * much as it can and report what it could not — so the caller decides the
   * aggregate outcome (typically: exit non-zero when any entry failed).
   */
  outcomes: readonly UndoOutcome[];
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
 * @returns The per-undo outcomes and the count of undos that succeeded
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

  // Phase 2: Execute collected undos in reverse (LIFO)
  return runCollectedUndos(undos, options);
};

/**
 * Execute an already-collected undo plan in reverse (LIFO) order.
 *
 * Split out of {@link runUndo} for callers that collect first — to preview
 * the plan or ask for confirmation — and must not walk the task a second
 * time (collect once, then execute exactly what was shown).
 *
 * Each undo runs ISOLATED: a failure is recorded as a `failed`
 * {@link UndoOutcome} and the remaining undos still run. Aborting a reversal
 * at its first failure is wrong for a reversal — every skipped undo is an
 * artifact knowingly left behind — so failure here is data for the caller,
 * not an abort. The one exception is interruption (`TASK_INTERRUPTED`):
 * cancellation must stop the run, exactly as the interpreter's recovery
 * frames refuse to swallow it, so it rethrows and the pending undos are not
 * attempted.
 *
 * @param undos - Undo tasks in forward execution order (as `collectUndos`
 *   returns them, each possibly carrying its declaration's `undoKey`);
 *   executed here in reverse
 * @param options - RunTaskOptions passed to each undo execution
 * @returns The per-undo outcomes (in execution order) and the count of undos
 *   that succeeded
 */
export const runCollectedUndos = async (
  undos: readonly UndoTask[],
  options?: RunTaskOptions,
): Promise<UndoResult> => {
  const outcomes: UndoOutcome[] = [];
  let undoCount = 0;

  for (const undoTask of [...undos].reverse()) {
    const key = undoTask.undoKey === undefined ? {} : { key: undoTask.undoKey };
    try {
      await runTask(undoTask, options);
      undoCount += 1;
      outcomes.push({ ...key, status: "undone" });
    } catch (error) {
      if (
        error instanceof TaskExecutionError &&
        error.taskError.code === "TASK_INTERRUPTED"
      ) {
        throw error;
      }
      // Normalise the throw to the structured TaskError the framework already
      // speaks (same rule as the interpreter's Parallel branch), so consumers
      // read one error shape whether the undo failed via the task failure
      // channel or via a raw synchronous throw.
      outcomes.push({
        ...key,
        status: "failed",
        error:
          error instanceof TaskExecutionError
            ? error.taskError
            : { code: "INTERNAL", message: String(error) },
      });
    }
  }

  return { undoCount, outcomes };
};
