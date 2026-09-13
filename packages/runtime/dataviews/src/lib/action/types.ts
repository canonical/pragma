/**
 * One action run over captured targets: what a caller asks to run, the
 * outcomes a source reports per target, the failures kept for reporting,
 * and the immutable record the run settles into.
 */

/**
 * Per-target outcome a source reports for one action run.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ActionOutcome =
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
export type ActionFailure = {
  readonly target: string;
  readonly reason: string;
};

/**
 * One action run, settled: the targets captured when it began and each
 * one's outcome. `runAction` resolves with this once every captured target
 * has succeeded or failed; a run with any failure ends `failed`.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ActionRun = {
  /** The captured targets, deduplicated when the run began. */
  readonly targets: readonly string[];
  readonly status: "succeeded" | "failed";
  readonly succeeded: readonly string[];
  readonly failed: readonly ActionFailure[];
};

/**
 * The live record of one run, as the runner drives it: the settled run's
 * members plus what only the runner reads — the payload and the selection
 * revision it captured, the targets still awaiting an outcome, and the
 * `pending` and `partial` states a run passes through on its way.
 */
export type ActionRunState = Omit<ActionRun, "status"> & {
  /** Caller-defined payload, captured by reference at construction. */
  readonly payload: unknown;
  /** Selection revision captured at construction. */
  readonly selectionRevision: number;
  readonly status: "pending" | "partial" | ActionRun["status"];
  /** Captured targets without a reported outcome yet. */
  readonly remaining: readonly string[];
};

/**
 * What a caller asks the provider to run: a declared action, over the
 * identities given or over the current selection when none are, with an
 * optional payload the source receives as it is.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ActionRequest = {
  /** The application's action name; the source maps it to its own call. */
  readonly action: string;
  /** The record identities to address; the selection when left out. */
  readonly targets?: readonly string[] | undefined;
  readonly payload?: unknown;
};

/** Configuration of one action run; the capture happens at construction. */
export type ActionRunConfig = {
  readonly targets: readonly string[];
  readonly payload?: unknown;
  readonly selectionRevision: number;
};

/** The record of one action run, with the write side its runner keeps. */
export type ActionRunRecord = {
  readonly state: ActionRunState;
  /** The settled run, as `runAction` hands it out; throws while targets remain. */
  readonly settle: () => ActionRun;
  /**
   * Record a partial result. Outcomes apply only to captured targets still
   * awaiting one: successful targets leave the record, failures are retained
   * with their reasons, and outcomes for unknown, already-settled or foreign
   * targets are ignored.
   */
  readonly recordOutcomes: (outcomes: readonly ActionOutcome[]) => void;
};
