import createIdentity, { type Identity } from "../createIdentity.js";
import applyQueryCommand from "../query/applyQueryCommand.js";
import canonicalSlice from "../query/canonicalSlice.js";
import type {
  QueryCommand,
  QueryCommandResult,
  ResultWindow,
  Slice,
} from "../query/types.js";

/** Display status of the result projection. */
export type ResultStatus =
  | "idle"
  | "pending"
  | "refreshing"
  | "ready"
  | "error";

/**
 * Which request produced the currently displayed rows. A pending or failed
 * request keeps the previous provenance: retained rows are never described
 * as results of the current query.
 */
export type ResultProvenance = {
  readonly requestId: string;
};

/**
 * Immutable result state. `lastError` records a failed request truthfully;
 * retained rows stay displayed when one exists.
 */
export type ResultState = {
  readonly status: ResultStatus;
  readonly rows: readonly unknown[] | null;
  readonly count: number | null;
  readonly provenance: ResultProvenance | null;
  readonly lastError: string | null;
};

/** Completion payload of one request. */
export type CompletionResult =
  | {
      readonly status: "success";
      readonly rows: readonly unknown[];
      readonly count: number | null;
    }
  | { readonly status: "failure"; readonly reason: string };

/** Coordinator configuration; `slice` and `window` seed every fresh scope. */
export type CollectionCoordinatorConfig = {
  readonly slice?: Slice;
  readonly window?: ResultWindow;
};

/** Result of dispatching one command through the coordinator. */
export type DispatchResult = QueryCommandResult & {
  /** Request identity to execute, or null when no new request is needed. */
  readonly requestId: string | null;
};

/** Immutable coordinator snapshot; referentially stable between mutations. */
export type CollectionCoordinatorState = {
  readonly scope: Identity;
  readonly slice: Slice;
  readonly window: ResultWindow;
  readonly result: ResultState;
  /** True when displayed rows were produced by the current query and window. */
  readonly resultsMatchCurrentQuery: boolean;
  readonly disposed: boolean;
};

/** Handle owning query/window coherence and the request lifecycle. */
export type CollectionCoordinator = {
  readonly state: CollectionCoordinatorState;
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
   * Adopt an externally authoritative slice and window together, as on
   * back/forward navigation or a restored view. Invalid windows throw, the
   * same rejections the addressed command layer applies. Supersedes any
   * pending request, discards stale input sessions above this layer, and
   * returns a request identity when the adopted state differs from the
   * current one.
   */
  readonly adopt: (slice: Slice, window: ResultWindow) => string | null;
  /**
   * Publish a completion for the most recently issued request, at most once.
   * Completions for superseded requests, rotated scopes or a disposed
   * coordinator are ignored; a success publishes rows, provenance and count
   * together; a failure retains rows with the error recorded.
   */
  readonly complete: (requestId: string, result: CompletionResult) => boolean;
  /**
   * Rotate to a fresh scope: query, window and result reset to the
   * configured seed and pending requests die. Completions from the old
   * scope never publish into the new one.
   */
  readonly rotateScope: () => void;
  /** Detach permanently; every later completion is ignored. */
  readonly dispose: () => void;
};

const emptySlice: Slice = Object.freeze({
  filter: [],
  search: null,
  sort: [],
  group: null,
});

const defaultWindow: ResultWindow = { page: 1, size: 50 };

/** Monotonic instance key: exact cross-instance distinctness, no
 * environment requirements. */
let coordinatorInstances = 0;

const idleResult: ResultState = Object.freeze({
  status: "idle",
  rows: null,
  count: null,
  provenance: null,
  lastError: null,
});

const fingerprintOf = (slice: Slice, window: ResultWindow): string =>
  JSON.stringify([canonicalSlice(slice), window], (_key, value) =>
    typeof value === "number" && !Number.isFinite(value)
      ? // An object marker cannot collide with any genuine operand: the
        // operand domain has no objects.
        { nonfinite: String(value) }
      : value,
  );

/**
 * Copy a caller-supplied slice so later mutations of the original cannot
 * corrupt adopted or seeded state, including nested predicate and
 * sort-term objects.
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
    group: slice.group,
  });

const copyWindow = (window: ResultWindow): ResultWindow => {
  if (!Number.isInteger(window.page) || window.page < 1) {
    throw new Error("page must be a positive integer");
  }
  if (!Number.isInteger(window.size) || window.size < 1) {
    throw new Error("size must be a positive integer");
  }
  return Object.freeze({ page: window.page, size: window.size });
};

/**
 * Create the collection coordinator: one owner of query/window coherence
 * and the request lifecycle. Requests carry scope-bound identities; only
 * the completion of the most recently issued request publishes, once. The
 * authority for the applied query (for example the browser URL) and the
 * execution of requests are wired above this layer.
 */
export default function createCollectionCoordinator(
  config: CollectionCoordinatorConfig = {},
): CollectionCoordinator {
  const seedSlice =
    config.slice === undefined ? emptySlice : copySlice(config.slice);
  const seedWindow = copyWindow(
    config.window === undefined ? defaultWindow : config.window,
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
  let result: ResultState = idleResult;
  let disposed = false;

  function buildSnapshot(): CollectionCoordinatorState {
    return Object.freeze({
      scope,
      slice,
      window,
      result,
      resultsMatchCurrentQuery:
        result.provenance !== null &&
        publishedFingerprint === currentFingerprint,
      disposed,
    });
  }

  let snapshot = buildSnapshot();

  const publish = (next: ResultState): void => {
    result = next;
    snapshot = buildSnapshot();
  };

  const beginRequest = (refreshing: boolean): string => {
    counter += 1;
    lastRequestId = `${instanceKey}:r${counter}`;
    publish({
      status: refreshing ? "refreshing" : "pending",
      rows: result.rows,
      count: result.count,
      provenance: result.provenance,
      lastError: null,
    });
    return lastRequestId;
  };

  return {
    get state(): CollectionCoordinatorState {
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
      if (!applied.queryChanged && !applied.windowChanged) {
        return { ...applied, requestId: null };
      }
      slice = applied.slice;
      window = applied.window;
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
    adopt(nextSlice: Slice, nextWindow: ResultWindow): string | null {
      if (disposed) {
        return null;
      }
      const copiedSlice = copySlice(nextSlice);
      const copiedWindow = copyWindow(nextWindow);
      const nextFingerprint = fingerprintOf(copiedSlice, copiedWindow);
      if (nextFingerprint === currentFingerprint) {
        return null;
      }
      slice = copiedSlice;
      window = copiedWindow;
      currentFingerprint = nextFingerprint;
      return beginRequest(false);
    },
    complete(requestId: string, completion: CompletionResult): boolean {
      if (disposed || lastRequestId === null || requestId !== lastRequestId) {
        // Obsolete request, rotated scope, repeated delivery, idle
        // coordinator, or no request at all: never publish stale results.
        return false;
      }
      lastRequestId = null;
      if (completion.status === "success") {
        publishedFingerprint = currentFingerprint;
        publish({
          status: "ready",
          rows: [...completion.rows],
          count: completion.count,
          provenance: { requestId },
          lastError: null,
        });
        return true;
      }
      publish({
        status: result.rows === null ? "error" : "ready",
        rows: result.rows,
        count: result.count,
        provenance: result.provenance,
        lastError: completion.reason,
      });
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
      snapshot = buildSnapshot();
    },
  };
}
