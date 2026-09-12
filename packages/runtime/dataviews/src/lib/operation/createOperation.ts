import createIdentity, { type Identity } from "../createIdentity.js";

/** Per-target outcome of a partial operation result. */
export type OperationOutcome =
  | { readonly target: string; readonly status: "succeeded" }
  | {
      readonly target: string;
      readonly status: "failed";
      readonly reason: string;
    };

/** Failure detail retained for retry and reporting. */
export type OperationFailure = {
  readonly target: string;
  readonly reason: string;
};

/** Immutable state of one operation invocation. */
export type OperationState = {
  /** Immutable captured targets, deduplicated at construction. */
  readonly targets: readonly string[];
  /** Caller-defined payload, captured by reference at construction. */
  readonly payload: unknown;
  /** Selection revision captured at construction. */
  readonly selectionRevision: number;
  readonly status: "pending" | "partial" | "succeeded" | "failed";
  readonly succeeded: readonly string[];
  readonly failed: readonly OperationFailure[];
  /** Captured targets without a reported outcome yet. */
  readonly remaining: readonly string[];
  readonly attempts: number;
};

/**
 * What a caller asks to be run over explicitly captured rows: the same
 * capture an operation records, without the revision its owner supplies.
 */
export type ActionInvocation = {
  readonly targets: readonly string[];
  readonly payload?: unknown;
};

/** Configuration of one invocation; the capture happens at construction. */
export type OperationConfig = {
  readonly targets: readonly string[];
  readonly payload?: unknown;
  readonly selectionRevision: number;
};

/** Handle of one operation invocation record. */
export type Operation = {
  readonly identity: Identity;
  readonly state: OperationState;
  /**
   * Record a partial result. Outcomes apply only to captured targets still
   * awaiting one: successful targets leave the record, failures are retained
   * with their reasons, and outcomes for unknown, already-settled or foreign
   * targets are ignored.
   */
  readonly recordOutcomes: (outcomes: readonly OperationOutcome[]) => void;
  /**
   * Retry the failed captured targets under the same operation identity,
   * keeping the original capture. No-op unless the last attempt ended in
   * failure.
   */
  readonly retry: () => void;
};

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
  let succeeded: string[] = [];
  let failed: OperationFailure[] = [];
  let remaining = [...targets];
  let status: OperationState["status"] = "pending";
  let attempts = 1;
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
      attempts,
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
        // A target settles at most once per attempt: it leaves `open`, so a
        // later outcome for it cannot arrive through this path.
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
    retry(): void {
      if (status !== "failed") {
        return;
      }
      remaining = failed.map((failure) => failure.target);
      succeeded = [];
      failed = [];
      attempts += 1;
      status = "pending";
      snapshot = buildSnapshot();
    },
  };
}
