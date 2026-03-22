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

import { mockEffect } from "./dry-run.js";
import {
  type RunTaskOptions,
  runTask,
  TaskExecutionError,
} from "./interpreter.js";
import type { Task } from "./types.js";

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
  // Track virtual filesystem state for exists() checks (same as dryRun)
  const virtualFs = new Set<string>();

  const walk = <T>(t: Task<T>): T => {
    switch (t._tag) {
      case "Pure":
        return t.value;

      case "Fail":
        throw new TaskExecutionError(t.error);

      case "Effect": {
        const eff = t.effect;

        // Collect undo if present
        if ("undo" in eff && eff.undo) {
          undos.push(eff.undo);
        }

        // Handle Parallel — walk all children
        if (eff._tag === "Parallel") {
          const results = eff.tasks.map((childTask) => {
            const childUndos = collectUndosWithVirtualFs(childTask, virtualFs);
            undos.push(...childUndos);
            // Mock the child result
            const childResult = mockEffectWithFs(
              { _tag: "Parallel", tasks: [] },
              virtualFs,
            );
            return childResult;
          });
          return walk(t.cont(results) as Task<T>);
        }

        // Handle Race — walk first child only (same as dryRun)
        if (eff._tag === "Race") {
          if (eff.tasks.length > 0) {
            const childUndos = collectUndosWithVirtualFs(
              eff.tasks[0],
              virtualFs,
            );
            undos.push(...childUndos);
          }
          const mockResult = mockEffectWithFs(eff, virtualFs);
          return walk(t.cont(mockResult) as Task<T>);
        }

        // Track virtual filesystem state for conditional branching
        const mockResult = mockEffectWithFs(eff, virtualFs);
        return walk(t.cont(mockResult) as Task<T>);
      }
    }
  };

  walk(task);
  return undos;
};

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Mock an effect result, tracking virtual filesystem state.
 * Mirrors the logic in dry-run.ts.
 */
const mockEffectWithFs = (
  eff: import("./types.js").Effect,
  virtualFs: Set<string>,
): unknown => {
  switch (eff._tag) {
    case "WriteFile":
    case "AppendFile":
      virtualFs.add(eff.path);
      return undefined;
    case "MakeDir":
      virtualFs.add(eff.path);
      return undefined;
    case "Symlink":
      virtualFs.add(eff.path);
      return undefined;
    case "Exists":
      return virtualFs.has(eff.path);
    default:
      return mockEffect(eff);
  }
};

/**
 * Collect undos from a child task, sharing virtual filesystem state.
 * Used for Parallel/Race child tasks.
 */
const collectUndosWithVirtualFs = <A>(
  task: Task<A>,
  virtualFs: Set<string>,
): Task<void>[] => {
  const undos: Task<void>[] = [];

  const walk = <T>(t: Task<T>): T => {
    switch (t._tag) {
      case "Pure":
        return t.value;

      case "Fail":
        throw new TaskExecutionError(t.error);

      case "Effect": {
        const eff = t.effect;

        if ("undo" in eff && eff.undo) {
          undos.push(eff.undo);
        }

        if (eff._tag === "Parallel") {
          const results = eff.tasks.map((childTask) => {
            const childUndos = collectUndosWithVirtualFs(childTask, virtualFs);
            undos.push(...childUndos);
            return undefined;
          });
          return walk(t.cont(results) as Task<T>);
        }

        if (eff._tag === "Race") {
          if (eff.tasks.length > 0) {
            const childUndos = collectUndosWithVirtualFs(
              eff.tasks[0],
              virtualFs,
            );
            undos.push(...childUndos);
          }
          const mockResult = mockEffectWithFs(eff, virtualFs);
          return walk(t.cont(mockResult) as Task<T>);
        }

        const mockResult = mockEffectWithFs(eff, virtualFs);
        return walk(t.cont(mockResult) as Task<T>);
      }
    }
  };

  walk(task);
  return undos;
};
