import driveSync from "./driveSync.js";
import { mockEffectWithFs } from "./dry-run.js";
import type { Effect, Task } from "./types.js";

/**
 * Collect undo tasks from a task tree without executing any effects.
 * Forward effects are mocked (same as dryRun). Only the `undo` field
 * on each effect is collected.
 *
 * Node-free by construction — the walk mocks every forward effect — so it
 * lives in the base entry; executing the collected undos against the host
 * is `runUndo`'s job (`@canonical/task/node`).
 *
 * KNOWN, MEASURED GAP, left open deliberately. Because the forward walk mocks
 * reads, a branch a task takes only after reading something real is never
 * walked, so its undos are never collected. Concrete case: pragma's
 * `writeConfigField` backs up a corrupt global config before overwriting it —
 * reachable only when a real read returns unparseable JSON — so `--undo`
 * collects no undo for that backup write. This is the same defect `--dry-run`
 * had, and the same `planTask` machinery would close it, but a plan-based
 * collector is node-touching and `collectUndos` is exported from the node-free
 * base entry to out-of-scope consumers. Closing it means either a second,
 * node-side collector or a breaking change to a shared export — a ruling for
 * the slice that owns those consumers, not a silent fix here.
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

/**
 * Walk a task tree with mocked forward effects over a shared virtual
 * filesystem, appending each effect's `undo` task (in forward order) to
 * `undos`, and returning the task's mocked forward value. Forward mocking
 * mirrors `dryRun` exactly — `Parallel` resolves to the array of its children's
 * mocked values and `Race` to its first child's — so a continuation that reads
 * a concurrency result sees the same shape it would under `dryRun`.
 * `Parallel`/`Race` children are walked against the same `virtualFs`, and the
 * forward walk is trampolined via {@link driveSync}, so deep chains stay
 * stack-safe.
 *
 * @param task - The task to collect undos from.
 * @param virtualFs - Shared set of paths created so far during the walk.
 * @param undos - Accumulator appended in forward execution order.
 * @returns The task's mocked forward value.
 * @note Impure — mutates the shared `virtualFs` set and `undos` accumulator.
 */
const collectUndosInto = (
  task: Task<unknown>,
  virtualFs: Set<string>,
  undos: Task<void>[],
): unknown => {
  const resolveEffect = (effect: Effect): unknown => {
    if ("undo" in effect && effect.undo) {
      undos.push(effect.undo);
    }

    if (effect._tag === "Parallel") {
      return effect.tasks.map((child) =>
        collectUndosInto(child, virtualFs, undos),
      );
    }

    if (effect._tag === "Race") {
      const first = effect.tasks.at(0);
      if (first !== undefined) {
        return collectUndosInto(first, virtualFs, undos);
      }
      return undefined;
    }

    return mockEffectWithFs(effect, virtualFs);
  };

  return driveSync(task, resolveEffect);
};
