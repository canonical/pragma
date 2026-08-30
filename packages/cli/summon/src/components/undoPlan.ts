/**
 * Pure helpers for presenting and gating an undo plan — shared by the Ink
 * wizard and the batch path so both executors show the SAME plan under the
 * SAME rules. Kept free of Ink/Commander so the contract is unit-testable
 * without a terminal.
 */

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
 * @param undos - Undo tasks in forward collection order, as `collectUndos`
 *   returns them.
 * @returns Effects describing the plan, in execution (reversed) order.
 */
export function describeUndoSteps(undos: readonly Task<void>[]): Effect[] {
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

/**
 * Whether a forward effect will be left behind by the undo: an `Exec` with
 * no undo of its own. An exec that carries an explicit `undo` is reversed
 * like any other effect and must not be reported as residue.
 */
export function isUnreversibleExec(effect: Effect): boolean {
  return (
    effect._tag === "Exec" && !("undo" in effect && effect.undo !== undefined)
  );
}

/**
 * Whether to skip the undo confirmation gate — the SAME contract the
 * forward run applies to its preview gate: flags only pre-fill answers,
 * while `--yes` and `--no-preview` both go straight to executing.
 */
export function shouldSkipUndoGate(options: {
  readonly yes: boolean;
  readonly preview: boolean;
}): boolean {
  return options.yes || !options.preview;
}
