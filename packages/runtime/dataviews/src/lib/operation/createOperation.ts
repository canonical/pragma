import { createIdentity } from "../identity/index.js";
import type {
  Operation,
  OperationConfig,
  OperationFailure,
  OperationOutcome,
  OperationState,
} from "./types.js";

/**
 * Create one operation invocation: targets, payload and the selection
 * revision are captured at construction, so later selection changes can
 * never retarget execution. At least one target is required. Payload is
 * captured by reference; callers must not mutate it after construction.
 */
export default function createOperation(config: OperationConfig): Operation {
  if (config.targets.length === 0) {
    throw new Error("operation requires at least one captured target");
  }
  const identity = createIdentity();
  const targets = Object.freeze([...new Set(config.targets)]);
  const succeeded: string[] = [];
  const failed: OperationFailure[] = [];
  let remaining = [...targets];
  let status: OperationState["status"] = "pending";
  let snapshot = buildSnapshot();

  function settle(): void {
    if (remaining.length === 0) {
      status = failed.length > 0 ? "failed" : "succeeded";
    } else {
      status = "partial";
    }
  }

  function buildSnapshot(): OperationState {
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
    identity,
    get state(): OperationState {
      return snapshot;
    },
    recordOutcomes(outcomes: readonly OperationOutcome[]): void {
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
      settle();
      snapshot = buildSnapshot();
    },
  };
}
