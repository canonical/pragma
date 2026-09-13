/**
 * The coordinator's contract: the snapshot it publishes at every mutation
 * boundary — the collection's published state — the result and its
 * status, and the commands and completions it accepts. One state, so the
 * provider, its ports and every control read the same shape.
 */

import type {
  Query,
  QueryCommand,
  QueryCommandResult,
  ResultWindow,
  Slice,
} from "../query/index.js";
import type {
  Completion,
  GroupSummary,
  PageCursors,
  ResultProblem,
  ResultProvenance,
  SourceCounts,
} from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
/**
 * Display status of the result projection.
 *
 * `refresh-failed` is a settled problem over rows that still answer the
 * current query, as after a failed refresh: the rows are usable and the
 * problem is real, so both are reported. `stale` is the same over rows an
 * earlier query produced. `failed` is a problem with no rows to keep. A
 * result that does not match the current query never reports `ready`.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ResultStatus =
  | "idle"
  | "pending"
  | "refreshing"
  | "ready"
  | "refresh-failed"
  | "stale"
  | "failed";

/**
 * Immutable result state: one page of a collection as the renderer sees
 * it. Retained rows keep the provenance of the request that produced them,
 * so they are never described as results of the current query.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ResultState<TRow extends object = RowRecord> = {
  readonly status: ResultStatus;
  readonly rows: readonly TRow[] | null;
  /**
   * The page's group summaries; null until a source declares summaries.
   *
   * @seam grouping — read by the group header row's count
   */
  readonly groups: readonly GroupSummary[] | null;
  readonly counts: SourceCounts | null;
  /** Whether a further page exists when no count says so; null when unknown. */
  readonly more: boolean | null;
  readonly cursors: PageCursors | null;
  readonly provenance: ResultProvenance | null;
  /** The last refusal or failure, structurally; null after a success. */
  readonly problem: ResultProblem | null;
};

/** Coordinator configuration; `slice` and `window` seed every generation. */
export type QueryCoordinatorConfig = {
  readonly slice?: Slice | undefined;
  readonly window?: ResultWindow | undefined;
};

/** Result of dispatching one command through the coordinator. */
export type DispatchResult = QueryCommandResult & {
  /** Request identity to execute, or null when no new request is needed. */
  readonly requestId: string | null;
};

/**
 * The collection's published snapshot: its query and window, its result,
 * whether the rows answer the current query, the one request awaiting
 * completion, and the generation the snapshot belongs to. Immutable and
 * referentially stable between mutations.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsState<TRow extends object = RowRecord> = Query & {
  /**
   * Which generation this snapshot belongs to. `reset()` begins the next
   * one: query, window, result and pending request return to the seed, and
   * a completion issued under an earlier generation never publishes into
   * it. Observers detach what they hold for an old generation on seeing a
   * new one.
   */
  readonly generation: number;
  readonly result: ResultState<TRow>;
  /** True when displayed rows were produced by the current query and window. */
  readonly resultMatchesQuery: boolean;
  /**
   * The one request identity awaiting completion, or null when none is
   * outstanding. A source executes exactly this request: every other
   * completion is dropped by the identity guard.
   */
  readonly pendingRequestId: string | null;
};

/** Handle owning query/window coherence and the request lifecycle. */
export type QueryCoordinator<TRow extends object = RowRecord> = {
  readonly state: DataViewsState<TRow>;
  /**
   * Apply one addressed command coherently. An accepted change that moves
   * the query or window issues a new request identity and retains previous
   * rows with their old provenance until a matching completion arrives.
   */
  readonly dispatch: (command: QueryCommand) => DispatchResult;
  /**
   * Refresh the current query: retained rows stay displayed with a
   * refreshing status until a matching completion arrives; with no rows
   * to retain the request is pending, as the first one is.
   */
  readonly refresh: () => string;
  /**
   * Adopt an externally authoritative query, as on back/forward navigation
   * or a restored view. Invalid windows throw, the same rejections the
   * addressed command layer applies. Supersedes any pending request,
   * discards stale input sessions above this layer, and returns a request
   * identity when the adopted query differs from the current one.
   */
  readonly adopt: (query: Query) => string | null;
  /**
   * Publish a completion for the most recently issued request, at most
   * once. Completions for superseded requests or an earlier generation are
   * ignored. A success publishes rows, summaries, counts,
   * cursors and provenance together. A refusal or a failure keeps the rows
   * with the problem recorded — `failed` when no rows have been published,
   * `refresh-failed` while the kept rows still answer the current query,
   * `stale` when an earlier query produced them, even an empty set.
   */
  readonly complete: (
    requestId: string,
    completion: Completion<TRow>,
  ) => boolean;
  /**
   * Begin the next generation: query, window and result return to the
   * configured seed and the pending request dies. Completions from the
   * old generation never publish into the new one.
   */
  readonly reset: () => void;
};
