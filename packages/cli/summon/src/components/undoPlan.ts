/**
 * Pure helpers for gating an undo plan — shared by the Ink wizard and the
 * batch path so both executors apply the SAME rules. The plan itself is
 * described by summon-core's `describeUndoSteps`, which the pragma CLI uses
 * too. Kept free of Ink/Commander so the contract is unit-testable
 * without a terminal.
 */

import type { Effect } from "@canonical/task";

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
