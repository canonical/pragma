import {
  applyQueryCommand,
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type Query,
  type QueryCommand,
  type ResultWindow,
  rejectWindow,
  type Slice,
  spellQueryKey,
  spellSliceKey,
} from "../query/index.js";
import { areFacetsEqual, type Completion } from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import type {
  DataViewsState,
  DispatchResult,
  QueryCoordinator,
  QueryCoordinatorConfig,
  ResultState,
  ResultStatus,
} from "./types.js";

/** Monotonic instance key: exact cross-instance distinctness, no
 * environment requirements. */
let coordinatorInstances = 0;

const idleResult: ResultState<never> = Object.freeze({
  status: "idle",
  rows: null,
  groups: null,
  counts: null,
  facets: null,
  more: null,
  cursors: null,
  provenance: null,
  problem: null,
});

/**
 * Copy a caller-supplied slice so later mutations of the original cannot
 * corrupt adopted or starting state, including nested predicate, sort-term
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
  const rejection = rejectWindow(window);
  if (rejection !== null) {
    throw new Error(rejection);
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
 * Create the query coordinator: one owner of query/window coherence and
 * the request lifecycle. Requests carry instance-bound identities and a
 * reset drops the pending one; only the completion of the most recently
 * issued request publishes, once. The
 * authority for the applied query (for example the browser URL) and the
 * execution of requests are the provider's ports, wired above this layer.
 *
 * @note Impure by design: the coordinator is a record holding the query,
 * the window and the result, and every command mutates it; the handle is
 * the one place that state lives.
 */
export default function createQueryCoordinator<TRow extends object = RowRecord>(
  config: QueryCoordinatorConfig = {},
): QueryCoordinator<TRow> {
  const startSlice =
    config.start?.slice === undefined
      ? EMPTY_SLICE
      : copySlice(config.start.slice);
  const startWindow = copyWindow(config.start?.window ?? DEFAULT_WINDOW);

  let generation = 1;
  // Instance-unique request ids: a completion routed to the wrong
  // coordinator must mismatch loudly, never publish silently.
  const instanceKey = `i${++coordinatorInstances}`;
  let counter = 0;
  let lastRequestId: string | null = null;
  /** The key of the query and window that produced the displayed rows. */
  let publishedKey: string | null = null;
  let slice: Slice =
    config.initial === undefined ? startSlice : copySlice(config.initial.slice);
  let window: ResultWindow =
    config.initial === undefined
      ? startWindow
      : copyWindow(config.initial.window);
  let currentKey = spellQueryKey({ slice, window });
  /** The key of the slice in force, spelled when an adoption first compares
   * against it, and dropped whenever the slice moves. */
  let sliceKey: string | null = null;
  let result: ResultState<TRow> = idleResult;

  function buildSnapshot(): DataViewsState<TRow> {
    return Object.freeze({
      generation,
      slice,
      window,
      result,
      resultMatchesQuery:
        result.provenance !== null && publishedKey === currentKey,
      pendingRequestId: lastRequestId,
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
  const resolveProblemStatus = (): ResultStatus => {
    if (result.rows === null) {
      return "failed";
    }
    return publishedKey === currentKey ? "refresh-failed" : "stale";
  };

  return {
    get state(): DataViewsState<TRow> {
      return snapshot;
    },
    dispatch(command: QueryCommand): DispatchResult {
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
        sliceKey = null;
      }
      // The window is rebuilt by every accepted command, so it is always the
      // command layer's object and always copied.
      window = copyWindow(applied.window);
      currentKey = spellQueryKey({ slice, window });
      const requestId = beginRequest(false);
      return { ...applied, requestId };
    },
    refresh(): string {
      // Refreshing is the state of rows kept on display while the same
      // query is asked again; with no rows there is nothing to keep, and
      // the first page from idle is simply pending.
      return beginRequest(result.rows !== null);
    },
    adopt(query: Query): string | null {
      const copiedSlice = copySlice(query.slice);
      const copiedWindow = copyWindow(query.window);
      const nextKey = spellQueryKey({
        slice: copiedSlice,
        window: copiedWindow,
      });
      if (nextKey === currentKey) {
        return null;
      }
      // A move of the window alone keeps the slice it stood on, so what reads
      // the slice by identity — the facets it answered — sees no new query.
      const copiedSliceKey = spellSliceKey(copiedSlice);
      sliceKey ??= spellSliceKey(slice);
      if (copiedSliceKey !== sliceKey) {
        slice = copiedSlice;
        sliceKey = copiedSliceKey;
      }
      window = copiedWindow;
      currentKey = nextKey;
      return beginRequest(false);
    },
    complete(requestId: string, completion: Completion<TRow>): boolean {
      if (lastRequestId === null || requestId !== lastRequestId) {
        // Obsolete request, earlier generation, repeated delivery, or no
        // request at all: such a completion never publishes.
        return false;
      }
      lastRequestId = null;
      if (completion.status === "succeeded") {
        const { page } = completion;
        publishedKey = currentKey;
        publish({
          status: "ready",
          // Copied, not aliased: a source reusing one envelope across
          // deliveries must not mutate a snapshot already published.
          rows: Object.freeze([...page.rows]),
          groups: page.groups === null ? null : Object.freeze([...page.groups]),
          counts: Object.freeze({
            pageable: page.counts.pageable,
            matched: page.counts.matched,
            total: page.counts.total,
          }),
          // The same facets again keep their identity, so what reads them by
          // identity — a control showing counts — has nothing to redraw.
          facets:
            result.facets !== null && areFacetsEqual(result.facets, page.facets)
              ? result.facets
              : Object.freeze({ ...page.facets }),
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
      publish({
        ...result,
        status: resolveProblemStatus(),
        problem: completion,
      });
      return true;
    },
    reset(): void {
      generation += 1;
      lastRequestId = null;
      slice = startSlice;
      sliceKey = null;
      window = startWindow;
      currentKey = spellQueryKey({ slice, window });
      publishedKey = null;
      publish(idleResult);
    },
  };
}
