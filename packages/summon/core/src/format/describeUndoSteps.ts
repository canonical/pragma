import { dryRun, type Effect, type Task } from "@canonical/task";

/** Effects an undo task walks through that are not part of what it reverses. */
const PLUMBING = new Set(["Log", "ReadFile", "Exists", "ReadContext"]);

/**
 * Describe an undo plan in EXECUTION order (last collected step first —
 * `runCollectedUndos` executes LIFO, and the preview must show the order
 * that will actually run). Each undo contributes its visible effects; an
 * undo whose dry-run yields only plumbing (e.g. a remove-line undo, whose
 * reads are mocked so no write surfaces) contributes a synthetic Log line
 * naming the file it will revert, so the plan never under-reports a step.
 *
 * The one rule both CLIs preview an undo with: the summon bin's undo plan and
 * the pragma kernel's `--undo --dry-run`.
 *
 * @param undos - Undo tasks in forward collection order, as `collectUndos`
 *   returns them.
 * @returns Effects describing the plan, in execution (reversed) order.
 */
export default function describeUndoSteps(
  undos: readonly Task<void>[],
): Effect[] {
  return [...undos].reverse().flatMap((undoTask) => {
    const effects = dryRun(undoTask).effects;
    const visible = effects.filter((effect) => !PLUMBING.has(effect._tag));
    if (visible.length > 0) {
      return visible;
    }
    const touched = effects.find(
      (effect): effect is Effect & { path: string } =>
        "path" in effect && typeof effect.path === "string",
    );
    if (touched === undefined) {
      return [];
    }
    return [
      {
        _tag: "Log",
        level: "info",
        message: `Revert changes in ${touched.path}`,
      } as Effect,
    ];
  });
}
