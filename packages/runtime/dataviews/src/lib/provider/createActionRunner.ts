import {
  type ActionOutcome,
  type ActionRequest,
  type ActionRun,
  createActionRun,
} from "../action/index.js";
import type { RowRecord } from "../rows/index.js";
import { describeError, pluralize } from "../source/index.js";
import type { ActionRunnerConfig } from "./types.js";

/**
 * Create the provider's action runner. A run addresses the identities the
 * request names, or the selection when it names none; the targets and the
 * selection revision are captured when the run begins, so later selection
 * changes never retarget it. Every captured target settles once — a target
 * the source reports nothing for fails rather than staying pending — and
 * the successful ones leave the selection while failures stay for review.
 *
 * Rejects when the action is not declared, addresses nothing, or addresses
 * more than the declaration allows: those are the caller's mistakes, not
 * outcomes of the run.
 *
 * @note Impure by design: a run calls the source's action port and edits
 * the provider's selection with the outcome.
 */
export default function createActionRunner<TRow extends object = RowRecord>(
  config: ActionRunnerConfig<TRow>,
): (request: ActionRequest) => Promise<ActionRun> {
  const { source, capabilities, selection } = config;
  return async (request: ActionRequest): Promise<ActionRun> => {
    const runner = source.runAction;
    if (runner === undefined) {
      throw new Error("this source runs no actions");
    }
    const declared = Object.hasOwn(capabilities.actions, request.action)
      ? capabilities.actions[request.action]
      : undefined;
    if (declared === undefined) {
      throw new Error(`this source declares no "${request.action}" action`);
    }
    const revision = selection.state.get().revision;
    const targets = request.targets ?? [...selection.state.get().ids];
    if (targets.length === 0) {
      throw new Error(`"${request.action}" addresses no record`);
    }
    const { limit } = declared;
    if (limit !== null && targets.length > limit) {
      throw new Error(
        `"${request.action}" addresses at most ${pluralize(limit, "record")} at a time`,
      );
    }
    const record = createActionRun({
      targets,
      payload: request.payload,
      selectionRevision: revision,
    });
    const captured = record.state.targets;
    let outcomes: readonly ActionOutcome[];
    try {
      outcomes = await runner({
        action: request.action,
        targets: { kind: "explicit", ids: captured },
        payload: request.payload,
      });
    } catch (error) {
      const reason = describeError(error);
      outcomes = captured.map((target) => ({
        target,
        status: "failed" as const,
        reason,
      }));
    }
    record.recordOutcomes(outcomes);
    const unreported = record.state.remaining;
    if (unreported.length > 0) {
      record.recordOutcomes(
        unreported.map((target) => ({
          target,
          status: "failed" as const,
          reason: "the source reported no outcome",
        })),
      );
    }
    selection.remove(record.state.succeeded);
    return record.settle();
  };
}
