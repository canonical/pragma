import { createIdentity, type Identity } from "../identity/index.js";
import {
  applyQueryCommand,
  canonicalSlice,
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type Query,
  type QueryCommand,
  type QueryCommandResult,
  type ResultWindow,
  type Slice,
  stableJson,
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
 * `refreshFailed` is a settled problem over rows that still answer the
 * current query, as after a failed refresh: the rows are usable and the
 * problem is real, so both are reported. `stale` is the same over rows an
 * earlier query produced. `failed` is a problem with no rows to keep. A
 * result that does not match the current query never reports `ready`.
 *
 * Seam for the grouping unit: a shape change withholds rows behind a
 * status of its own, which nothing can reach while no source groups.
 */
export type ResultStatus =
  | "idle"
  | "pending"
  | "refreshing"
  | "ready"
  | "refreshFailed"
  | "stale"
  | "failed";

/**
 * Immutable result state: one page of a collection as the renderer sees
 * it. Retained rows keep the provenance of the request that produced them,
 * so they are never described as results of the current query.
 */
export type ResultState<TRow extends object = RowRecord> = {
  readonly status: ResultStatus;
  readonly rows: readonly TRow[] | null;
  /** Seam for the grouping unit: null until a source declares summaries. */
  readonly groups: readonly GroupSummary[] | null;
  readonly counts: SourceCounts | null;
  /** Whether a further page exists when no count says so; null when unknown. */
  readonly more: boolean | null;
  readonly cursors: PageCursors | null;
  readonly provenance: ResultProvenance | null;
  /** The last refusal or failure, structurally; null after a success. */
  readonly problem: ResultProblem | null;
};

/** Coordinator configuration; `slice` and `window` seed every fresh scope. */
export type CollectionCoordinatorConfig = {
  readonly slice?: Slice | undefined;
  readonly window?: ResultWindow | undefined;
};

/** Result of dispatching one command through the coordinator. */
export type DispatchResult = QueryCommandResult & {
  /** Request identity to execute, or null when no new request is needed. */
  readonly requestId: string | null;
};

/** Immutable coordinator snapshot; referentially stable between mutations. */
export type CollectionState<TRow extends object = RowRecord> = Query & {
  readonly scope: Identity;
  readonly result: ResultState<TRow>;
  /** True when displayed rows were produced by the current query and window. */
  readonly resultMatchesQuery: boolean;
  /**
   * The one request identity awaiting completion, or null when none is
   * outstanding. A source executes exactly this request: every other
   * completion is dropped by the identity guard.
   */
  readonly pendingRequestId: string | null;
  readonly disposed: boolean;
};

/** Handle owning query/window coherence and the request lifecycle. */
export type CollectionCoordinator<TRow extends object = RowRecord> = {
  readonly state: CollectionState<TRow>;
  /**
   * Apply one addressed command coherently. An accepted change that moves
   * the query or window issues a new request identity and retains previous
   * rows with their old provenance until a matching completion arrives.
   */
  readonly dispatch: (command: QueryCommand) => DispatchResult;
  /**
   * Refresh the current query: retained rows stay displayed with a
   * refreshing status until a matching completion arrives.
   */
  readonly refresh: () => string | null;
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
   * once. Completions for superseded requests, rotated scopes or a disposed
   * coordinator are ignored. A success publishes rows, summaries, counts,
   * cursors and provenance together. A refusal or a failure keeps the rows
   * with the problem recorded — `failed` when no rows have been published,
   * `refreshFailed` while the kept rows still answer the current query,
   * `stale` when an earlier query produced them, even an empty set.
   */
  readonly complete: (
    requestId: string,
    completion: Completion<TRow>,
  ) => boolean;
  /**
   * Rotate to a fresh scope: query, window and result reset to the
   * configured seed and pending requests die. Completions from the old
   * scope never publish into the new one.
   */
  readonly rotateScope: () => void;
  /** Detach permanently; every later completion is ignored. */
  readonly dispose: () => void;
};

/** Monotonic instance key: exact cross-instance distinctness, no
 * environment requirements. */
let coordinatorInstances = 0;

const idleResult: ResultState<never> = Object.freeze({
  status: "idle",
  rows: null,
  groups: null,
  counts: null,
  more: null,
  cursors: null,
  provenance: null,
  problem: null,
});

const fingerprintOf = (slice: Slice, window: ResultWindow): string =>
  stableJson([canonicalSlice(slice), window]);

/**
 * Copy a caller-supplied slice so later mutations of the original cannot
 * corrupt adopted or seeded state, including nested predicate, sort-term
 * and group-term objects.
 */
const copySlice = (slice: Slice): Slice =>
  Object.freeze({
    filter: Object.freeze(
      slice.filter.map((predicate) =>
        Object.freeze({
          field: predicate.field,
          operator: predicate.operator,
          operands: Object.freeze([...predicate.operands]),
        }),
      ),
    ),
    search: slice.search,
    sort: Object.freeze(
      slice.sort.map((term) =>
        Object.freeze({ field: term.field, direction: term.direction }),
      ),
    ),
    group: Object.freeze(
      slice.group.map((term) => Object.freeze({ field: term.field })),
    ),
  });

const copyWindow = (window: ResultWindow): ResultWindow => {
  if (!Number.isInteger(window.page) || window.page < 1) {
    throw new Error("page must be a positive integer");
  }
  if (!Number.isInteger(window.size) || window.size < 1) {
    throw new Error("size must be a positive integer");
  }
  if (window.cursor === "") {
    throw new Error("cursor must not be empty; use null to clear it");
  }
  return Object.freeze({
    page: window.page,
    size: window.size,
    cursor: window.cursor,
    collapsed: Object.freeze(
      window.collapsed.map((path) => Object.freeze([...path])),
    ),
  });
};

/**
 * Create the collection coordinator: one owner of query/window coherence
 * and the request lifecycle. Requests carry scope-bound identities; only
 * the completion of the most recently issued request publishes, once. The
 * authority for the applied query (for example the browser URL) and the
 * execution of requests are wired above this layer.
 */
export default function createCollectionCoordinator<
  TRow extends object = RowRecord,
>(config: CollectionCoordinatorConfig = {}): CollectionCoordinator<TRow> {
  const seedSlice =
    config.slice === undefined ? EMPTY_SLICE : copySlice(config.slice);
  const seedWindow = copyWindow(
    config.window === undefined ? DEFAULT_WINDOW : config.window,
  );

  let scope = createIdentity();
  // Instance-unique request ids: a completion routed to the wrong
  // coordinator must mismatch loudly, never publish silently.
  const instanceKey = `i${++coordinatorInstances}`;
  let counter = 0;
  let lastRequestId: string | null = null;
  /** Fingerprint of the query and window that produced the displayed rows. */
  let publishedFingerprint: string | null = null;
  let slice: Slice = seedSlice;
  let window: ResultWindow = seedWindow;
  let currentFingerprint = fingerprintOf(slice, window);
  let result: ResultState<TRow> = idleResult;
  let disposed = false;

  function buildSnapshot(): CollectionState<TRow> {
    return Object.freeze({
      scope,
      slice,
      window,
      result,
      resultMatchesQuery:
        result.provenance !== null &&
        publishedFingerprint === currentFingerprint,
      pendingRequestId: lastRequestId,
      disposed,
    });
  }

  let snapshot = buildSnapshot();

  const publish = (next: ResultState<TRow>): void => {
    result = next;
    snapshot = buildSnapshot();
  };

  const beginRequest = (refreshing: boolean): string => {
    counter += 1;
    lastRequestId = `${instanceKey}:r${counter}`;
    publish({
      ...result,
      status: refreshing ? "refreshing" : "pending",
      problem: null,
    });
    return lastRequestId;
  };

  /** Where a settled problem leaves the projection. */
  const problemStatus = (): ResultStatus => {
    if (result.rows === null) {
      return "failed";
    }
    return publishedFingerprint === currentFingerprint
      ? "refreshFailed"
      : "stale";
  };

  return {
    get state(): CollectionState<TRow> {
      return snapshot;
    },
    dispatch(command: QueryCommand): DispatchResult {
      if (disposed) {
        return {
          status: "rejected",
          reason: "coordinator is disposed",
          slice,
          window,
          requestId: null,
        };
      }
      const applied = applyQueryCommand(slice, window, command);
      if (applied.status === "rejected") {
        return { ...applied, requestId: null };
      }
      if (!applied.sliceChanged && !applied.windowChanged) {
        return { ...applied, requestId: null };
      }
      // The command layer threads the caller's own predicate, sort-term and
      // group-path objects through, so what it changed is copied here, as it
      // is on the adopt path. What it did not change is already this
      // coordinator's own copy, and keeping its identity is what lets a
      // source tell a window-only move from a new query without comparing
      // them.
      if (applied.slice !== slice) {
        slice = copySlice(applied.slice);
      }
      // The window is rebuilt by every accepted command, so it is always the
      // command layer's object and always copied.
      window = copyWindow(applied.window);
      currentFingerprint = fingerprintOf(slice, window);
      const requestId = beginRequest(false);
      return { ...applied, requestId };
    },
    refresh(): string | null {
      if (disposed) {
        return null;
      }
      return beginRequest(true);
    },
    adopt(query: Query): string | null {
      if (disposed) {
        return null;
      }
      const copiedSlice = copySlice(query.slice);
      const copiedWindow = copyWindow(query.window);
      const nextFingerprint = fingerprintOf(copiedSlice, copiedWindow);
      if (nextFingerprint === currentFingerprint) {
        return null;
      }
      slice = copiedSlice;
      window = copiedWindow;
      currentFingerprint = nextFingerprint;
      return beginRequest(false);
    },
    complete(requestId: string, completion: Completion<TRow>): boolean {
      if (disposed || lastRequestId === null || requestId !== lastRequestId) {
        // Disposed coordinator, obsolete request, rotated scope, repeated
        // delivery, or no request at all: such a completion never publishes.
        return false;
      }
      lastRequestId = null;
      if (completion.status === "succeeded") {
        const { page } = completion;
        publishedFingerprint = currentFingerprint;
        publish({
          status: "ready",
          // Copied, not aliased: a source reusing one envelope across
          // deliveries must not mutate a snapshot already published.
          rows: Object.freeze([...page.rows]),
          groups: page.groups === null ? null : Object.freeze([...page.groups]),
          counts: Object.freeze({
            visible: page.counts.visible,
            matched: page.counts.matched,
            total: page.counts.total,
          }),
          more: page.more,
          cursors:
            page.cursors === null
              ? null
              : Object.freeze({
                  next: page.cursors.next,
                  previous: page.cursors.previous,
                }),
          // Provenance is the request this coordinator issued, never
          // anything the source says about it.
          provenance: Object.freeze({ requestId, slice, window }),
          problem: null,
        });
        return true;
      }
      // The completion is the problem: re-keying it would put one fact in
      // two shapes on the surface.
      publish({ ...result, status: problemStatus(), problem: completion });
      return true;
    },
    rotateScope(): void {
      if (disposed) {
        return;
      }
      scope = createIdentity();
      lastRequestId = null;
      slice = seedSlice;
      window = seedWindow;
      currentFingerprint = fingerprintOf(slice, window);
      publishedFingerprint = null;
      publish(idleResult);
    },
    dispose(): void {
      disposed = true;
      // A disposed coordinator ignores every completion, so it never
      // reports a request as still awaiting one.
      lastRequestId = null;
      snapshot = buildSnapshot();
    },
  };
}
