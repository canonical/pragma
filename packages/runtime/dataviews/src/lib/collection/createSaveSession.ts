/**
 * Save-race semantics for durable preferences and views: a completion
 * updates the submitted baseline only, so edits made while saving remain
 * dirty, and a delayed external read never overwrites newer local state.
 */

/** Immutable state of one save session. */
export type SaveSessionState<T> = {
  /** Baseline of the last durable success. */
  readonly baseline: T;
  /** Current local value; may be edited while a save is in flight. */
  readonly current: T;
  /** Snapshot submitted to the store, or null when idle. */
  readonly submitted: T | null;
  readonly status: "idle" | "pending" | "failed";
  readonly dirty: boolean;
  /**
   * Version of the local value: bumped on every edit and on every save
   * submission. External reads carry the revision they were issued under.
   */
  readonly revision: number;
  /** Failure note of the last save attempt; null means no failure on record. */
  readonly failure: string | null;
};

/** Configuration of one save session. */
export type SaveSessionConfig<T> = {
  readonly initial: T;
  readonly equals: (a: T, b: T) => boolean;
};

/** Handle of one save session. */
export type SaveSession<T> = {
  readonly state: SaveSessionState<T>;
  /** Edit the local value. Allowed while saving; bumps the revision. */
  readonly edit: (next: T) => void;
  /**
   * Submit the current value and return the attempt identity, or null when
   * a save is already in flight.
   */
  readonly beginSave: () => string | null;
  /**
   * Record a durable success for the given attempt: only the submitted
   * snapshot becomes the baseline. Edits made while saving remain dirty.
   */
  readonly saveCompleted: (attempt: string) => void;
  /**
   * Record a failure for the given attempt: the baseline is retained and
   * the failure is recorded.
   */
  readonly saveFailed: (attempt: string, reason: string) => void;
  /**
   * Apply a delayed external read (for example a preference that resolved
   * late). It applies only to the still-current target: when local edits or
   * a save submission moved the revision since the read was issued, the
   * read is discarded.
   */
  readonly applyExternalRead: (value: T, seenRevision: number) => boolean;
};

/** Monotonic instance key: exact cross-session distinctness. */
let saveSessionInstances = 0;

/**
 * Create a save session over one durable value. Persistence execution stays
 * with the caller; this record owns only the baseline/dirty race. Attempt
 * identities make completions one-shot: a late completion of a superseded
 * attempt is ignored, exactly like superseded request completions.
 */
export default function createSaveSession<T>(
  config: SaveSessionConfig<T>,
): SaveSession<T> {
  let baseline = config.initial;
  let current = config.initial;
  let submitted: T | null = null;
  let currentAttempt: string | null = null;
  // Instance-unique attempt ids: a completion routed to the wrong session
  // must mismatch loudly, never advance a baseline silently.
  const instanceKey = `i${++saveSessionInstances}`;
  let attemptCounter = 0;
  let status: SaveSessionState<T>["status"] = "idle";
  let revision = 0;
  let failure: string | null = null;
  let snapshot = buildSnapshot();

  function buildSnapshot(): SaveSessionState<T> {
    return Object.freeze({
      baseline,
      current,
      submitted,
      status,
      dirty: !config.equals(current, baseline),
      revision,
      failure,
    });
  }

  return {
    get state(): SaveSessionState<T> {
      return snapshot;
    },
    edit(next: T): void {
      current = next;
      revision += 1;
      if (status === "failed") {
        status = "idle";
      }
      failure = null;
      snapshot = buildSnapshot();
    },
    beginSave(): string | null {
      if (status === "pending") {
        return null;
      }
      attemptCounter += 1;
      currentAttempt = `${instanceKey}:s${attemptCounter}`;
      submitted = current;
      status = "pending";
      failure = null;
      // A save submission also moves the value's version: a read issued
      // before it must not clobber the submitted state when it resolves.
      revision += 1;
      snapshot = buildSnapshot();
      return currentAttempt;
    },
    saveCompleted(attempt: string): void {
      if (attempt !== currentAttempt || submitted === null) {
        // Superseded or unknown attempt: never advance the baseline.
        return;
      }
      baseline = submitted;
      submitted = null;
      currentAttempt = null;
      status = "idle";
      failure = null;
      snapshot = buildSnapshot();
    },
    saveFailed(attempt: string, reason: string): void {
      if (attempt !== currentAttempt || submitted === null) {
        return;
      }
      submitted = null;
      currentAttempt = null;
      status = "failed";
      failure = reason;
      snapshot = buildSnapshot();
    },
    applyExternalRead(value: T, seenRevision: number): boolean {
      if (status === "pending" || seenRevision !== revision) {
        // A save is in flight, or the value moved on since the read was
        // issued; the read must not overwrite either.
        return false;
      }
      baseline = value;
      current = value;
      status = "idle";
      failure = null;
      snapshot = buildSnapshot();
      return true;
    },
  };
}
