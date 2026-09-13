import canonicalSlice from "../query/canonicalSlice.js";
import type { Query } from "../query/types.js";
import type { SourcePage, SourceRefusal } from "../result/types.js";
import type { RowRecord } from "../rows/types.js";
import copyCapabilities from "./copyCapabilities.js";
import reasonOf from "./reasonOf.js";
import type {
  Source,
  SourceActionRunner,
  SourceCapabilities,
  SourceRequest,
} from "./types.js";

/**
 * The structural surface of one query-library observation. TanStack
 * Query's `QueryObserverResult` satisfies it, and so does any client
 * reporting the same three states. It is a product rather than a union of
 * the three states, because that is the shape those clients publish.
 */
export type QueryObservation<TData> = {
  readonly status: "pending" | "error" | "success";
  readonly data: TData | undefined;
  readonly error: unknown;
};

/** The structural surface of one query-library observer. */
export type QueryObserver<TData> = {
  /** The current observation, read once at attach time. */
  readonly getCurrentResult: () => QueryObservation<TData>;
  /** Observe later changes; the return value detaches this observer. */
  readonly subscribe: (
    listener: (observation: QueryObservation<TData>) => void,
  ) => () => void;
  /** Detach the observer from its query. The client's cache is untouched. */
  readonly destroy: () => void;
};

/** The query one observer watches. */
export type ObservedQuery<TData> = {
  readonly queryKey: readonly unknown[];
  readonly queryFn: () => Promise<TData>;
};

/**
 * Mint one observer against the application's own client, for example
 * `(query) => new QueryObserver(queryClient, query)`. The client, its
 * cache, its retries and its invalidations stay the application's.
 */
export type QueryObserverFactory<TData> = (
  query: ObservedQuery<TData>,
) => QueryObserver<TData>;

/** Configuration of one query-library source. */
export type QuerySourceConfig<TRow extends object = RowRecord> = {
  /** What this endpoint can execute. Declared, never inferred. */
  readonly capabilities: SourceCapabilities;
  /**
   * Refusals the declaration cannot express, such as a search this endpoint
   * cannot combine with a filter. Pure and synchronous; no round trip.
   */
  readonly refuses?: (query: Query) => readonly SourceRefusal[];
  /** Stable prefix of the query key; the canonical query is appended. */
  readonly queryKey: readonly unknown[];
  /**
   * Fetch one page, mapping the endpoint's answer onto the envelope.
   * Transport, retry and cancellation belong to the client this function
   * runs under.
   */
  readonly fetchPage: (request: SourceRequest) => Promise<SourcePage<TRow>>;
  /** Mint one observer against the application's client. */
  readonly observe: QueryObserverFactory<SourcePage<TRow>>;
  /** Row operations, when the endpoint has any. */
  readonly runAction?: SourceActionRunner;
};

/** The last thing delivered, so an unchanged observation is not repeated. */
type Delivered<TRow extends object> =
  | { readonly status: "succeeded"; readonly page: SourcePage<TRow> }
  | { readonly status: "failed"; readonly error: unknown };

/**
 * Create a source over an observable query client such as TanStack Query.
 * Each request attaches one observer to the query keyed by its canonical
 * query and window, so two requests for the same query share the client's
 * cache entry; a cached page is delivered at attach time, and every later
 * observation — a refetch, an invalidation, a store write — is delivered
 * too. Releasing detaches the observer and leaves the cache alone.
 *
 * Unchanged observations are recognised by reference, so the client must
 * hand back the same `data` reference while the payload has not changed.
 */
export default function createQuerySource<TRow extends object = RowRecord>(
  config: QuerySourceConfig<TRow>,
): Source<TRow> {
  const capabilities = copyCapabilities(config.capabilities);
  return {
    capabilities,
    ...(config.refuses === undefined ? {} : { refuses: config.refuses }),
    execute(request, deliver) {
      const observer = config.observe({
        queryKey: [
          ...config.queryKey,
          canonicalSlice(request.slice),
          request.window,
        ],
        queryFn: () => config.fetchPage(request),
      });
      let delivered: Delivered<TRow> | null = null;

      const push = (observation: QueryObservation<SourcePage<TRow>>): void => {
        switch (observation.status) {
          case "pending":
            // The coordinator already shows the request as in flight.
            return;
          case "success": {
            const page = observation.data;
            if (page === undefined) {
              return;
            }
            if (delivered?.status === "succeeded" && delivered.page === page) {
              return;
            }
            delivered = { status: "succeeded", page };
            deliver({ status: "succeeded", page });
            return;
          }
          case "error": {
            const { error } = observation;
            if (delivered?.status === "failed" && delivered.error === error) {
              return;
            }
            delivered = { status: "failed", error };
            deliver({
              status: "failed",
              failure: {
                reason: reasonOf(error),
                cause: error,
                transient: null,
              },
            });
            return;
          }
        }
      };

      const unsubscribe = observer.subscribe(push);
      push(observer.getCurrentResult());
      return () => {
        unsubscribe();
        observer.destroy();
      };
    },
    ...(config.runAction === undefined ? {} : { runAction: config.runAction }),
  };
}
