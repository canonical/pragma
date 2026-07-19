/**
 * The server-side data prepare step (P-2 Stage 1): match the URL, execute the
 * matched route's query to completion against the in-process ke-graphql
 * backend, and serialise the resulting Relay store for hydration.
 *
 * One function, integrated into the two dev server bricks (`server.bun.ts`,
 * `server.express.ts`) ahead of renderer construction. The two preview bricks
 * are explicitly NOT integrated yet: they carry no backend at all, and
 * bundling the Oxigraph WASM store into the compiled `dist/server` output is
 * an unverified spike that gates them (see the P-2 design note, §3).
 *
 * The backend handle stays in THIS (native) module registry: `EntryServer`
 * and the rest of the render world load via `ssrLoadModule`, and an SSR-graph
 * import of `getGraphqlBackend` would boot a second store in the process.
 * Only plain data (the serialised records) crosses the registry boundary.
 */

import { isIncrementalResults, mergeIncremental } from "@canonical/ke-graphql";
import {
  type FetchFunction,
  fetchQuery,
  type GraphQLResponse,
  type OperationType,
} from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { createEnvironment } from "#relay/environment.js";
import { type GraphqlBackend, getGraphqlBackend } from "./graphql.js";
import { matchRouteQuery } from "./routeQueries.js";

/** The serialised store snapshot for `initialData.relay`. */
export interface PreparedRelayData {
  readonly records: RecordMap;
}

/**
 * Adapt the backend's in-process executor to relay-runtime's `FetchFunction`.
 * Relay hands over the operation's full text (`params.text` — generated
 * artifacts carry it with `id: null`), which is also what keeps the
 * two-graphql-versions boundary text-only (see `GraphqlExecuteArgs`).
 */
export const toBackendFetchFn =
  (backend: GraphqlBackend): FetchFunction =>
  (params, variables) => {
    const { text } = params;
    if (!text) {
      throw new Error(
        `operation ${params.name} carries no text — persisted queries are ` +
          "not supported at the in-process boundary",
      );
    }
    return (async (): Promise<GraphQLResponse> => {
      const result = await backend.execute({
        source: text,
        variableValues: variables,
        operationName: params.name,
      });
      // Stage 1 has no streaming: if the executor ever returns an
      // incremental stream, drain it into one complete result
      // (correctness-preserving; Stage 2 replaces this with a multi-payload
      // observable). The cast is the graphql-17/relay boundary: both sides
      // describe the same executed-result wire shape.
      const complete = isIncrementalResults(result)
        ? await mergeIncremental(result)
        : result;
      return complete as GraphQLResponse;
    })();
  };

/**
 * Execute the matched route's query and serialise the store. Returns
 * `undefined` when the route maps to no query — and on any failure
 * (malformed route meta, execution error), logging it: the page then renders
 * without server data and the client fetches over HTTP, which is the pre-P-2
 * behaviour rather than a 500.
 *
 * @note Impure — boots the shared backend singleton on first mapped request.
 */
export const prepareRelayData = async (
  url: string,
): Promise<PreparedRelayData | undefined> => {
  try {
    // Matching happens INSIDE the try: the collector behind `matchRouteQuery`
    // walks EVERY route's meta for every URL, so one malformed `ssrQuery`
    // entry would otherwise escape the catch and turn all server renders
    // into 500s instead of degrading to the no-server-data path below.
    const matched = matchRouteQuery(url);
    if (!matched) return undefined;
    const backend = await getGraphqlBackend();
    // A dedicated per-request execution environment (never a shared one), so
    // the serialised snapshot contains exactly this route's data (P-2 D9).
    const environment = createEnvironment({
      fetchFn: toBackendFetchFn(backend),
    });
    await fetchQuery<OperationType>(
      environment,
      matched.query,
      matched.variables,
    ).toPromise();
    // `RecordMap` isn't root-exported from relay-runtime (hence the deep
    // import above) and `toJSON()` returns the untyped JSON shape — hence
    // the cast back to the nominal type here.
    const records = environment.getStore().getSource().toJSON() as RecordMap;
    return { records };
  } catch (error) {
    console.error(
      `[ssr] relay prepare failed for ${url} — rendering without server data`,
      error,
    );
    return undefined;
  }
};
