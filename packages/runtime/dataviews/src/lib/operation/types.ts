/**
 * One action run over captured targets: the outcomes a source reports per
 * target, the failures kept for reporting, and the immutable record the
 * run settles into.
 */

import type { Identity } from "../identity/index.js";
/**
 * Per-target outcome of a partial operation result.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type OperationOutcome =
  | { readonly target: string; readonly status: "succeeded" }
  | {
      readonly target: string;
      readonly status: "failed";
      readonly reason: string;
    };

/**
 * Failure detail retained for reporting.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type OperationFailure = {
  readonly target: string;
  readonly reason: string;
};

/**
 * Immutable state of one operation invocation.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
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
};

/**
 * What a caller asks to be run over explicitly captured rows: the same
 * capture an operation records, without the revision its owner supplies.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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

/**
 * Handle of one operation invocation record.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
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
};
