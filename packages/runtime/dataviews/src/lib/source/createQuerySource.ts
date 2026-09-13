import { canonicalizeSlice } from "../query/index.js";
import type { SourcePage } from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import copyCapabilities from "./copyCapabilities.js";
import describeError from "./describeError.js";
import type { QueryObservation, QuerySourceConfig, Source } from "./types.js";

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
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createQuerySource<TRow extends object = RowRecord>(
  config: QuerySourceConfig<TRow>,
): Source<TRow> {
  const capabilities = copyCapabilities(config.capabilities);
  return {
    capabilities,
    ...(config.refusals === undefined ? {} : { refusals: config.refusals }),
    execute(request, deliver) {
      const observer = config.createObserver({
        queryKey: [
          ...config.queryKey,
          canonicalizeSlice(request.slice),
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
                reason: describeError(error),
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
