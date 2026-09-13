import type {
  ActionFailure,
  ActionOutcome,
  ActionRun,
  ActionRunConfig,
  ActionRunRecord,
  ActionRunState,
} from "./types.js";

/**
 * Create one action run: targets, payload and the selection revision are
 * captured at construction, so later selection changes can never retarget
 * execution. At least one target is required. Payload is captured by
 * reference; callers must not mutate it after construction.
 *
 * @note Impure by design: the record accumulates the outcomes a source
 * reports and rebuilds its snapshot; the run is the one place they settle.
 */
export default function createActionRun(
  config: ActionRunConfig,
): ActionRunRecord {
  if (config.targets.length === 0) {
    throw new Error("an action run requires at least one captured target");
  }
  const targets = Object.freeze([...new Set(config.targets)]);
  const succeeded: string[] = [];
  const failed: ActionFailure[] = [];
  let remaining = [...targets];
  let status: ActionRunState["status"] = "pending";
  let snapshot = buildSnapshot();

  function deriveStatus(): void {
    if (remaining.length === 0) {
      status = failed.length > 0 ? "failed" : "succeeded";
    } else {
      status = "partial";
    }
  }

  function buildSnapshot(): ActionRunState {
    return Object.freeze({
      targets,
      payload: config.payload,
      selectionRevision: config.selectionRevision,
      status,
      succeeded: Object.freeze([...succeeded]),
      failed: Object.freeze([...failed]),
      remaining: Object.freeze([...remaining]),
    });
  }

  return {
    get state(): ActionRunState {
      return snapshot;
    },
    settle(): ActionRun {
      if (status === "pending" || status === "partial") {
        throw new Error(
          "an action run settles once every target has an outcome",
        );
      }
      return Object.freeze({
        targets,
        status,
        succeeded: snapshot.succeeded,
        failed: snapshot.failed,
      });
    },
    recordOutcomes(outcomes: readonly ActionOutcome[]): void {
      const open = new Set(remaining);
      let settled = false;
      for (const entry of outcomes) {
        if (!open.has(entry.target)) {
          continue;
        }
        settled = true;
        // A target settles at most once: it leaves `open`, so a later
        // outcome for it cannot arrive through this path.
        open.delete(entry.target);
        if (entry.status === "succeeded") {
          succeeded.push(entry.target);
        } else {
          failed.push({ target: entry.target, reason: entry.reason });
        }
      }
      if (!settled) {
        return;
      }
      remaining = [...open];
      deriveStatus();
      snapshot = buildSnapshot();
    },
  };
}
