/**
 * The server-side data prepare step: match the URL, execute the matched
 * route's query to completion against the graph server, and serialise the
 * resulting Relay store for hydration.
 *
 * One function, integrated into ALL FOUR server bricks — the two dev servers
 * (`server.bun.ts`, `server.express.ts`) and, since the PRD-3 process split,
 * the two preview bricks by way of the compiled `renderer.tsx`. The preview
 * bricks could not have it before because the backend was in-process and
 * bundling an Oxigraph WASM store into `dist/server` was an unverified spike.
 * The graph is a separate process now, so the prepare step is just an HTTP
 * client and every brick can have one.
 *
 * ## No incremental drain here any more
 *
 * The previous in-process adapter had to drain ke-graphql's incremental
 * results itself (`isIncrementalResults` / `mergeIncremental`) because it
 * called the executor directly. Over HTTP that is the SERVER's job, and
 * ke-graphql already does it: `createGraphQLHandler` merges incremental
 * results into one complete JSON response whenever the request does not
 * accept `multipart/mixed` — see
 * `node_modules/.../ke-graphql/src/http/createGraphQLHandler.ts:392-400`.
 * Its `accepts` helper (`:133-143`) requires an EXACT media-type match, and
 * the wildcard `Accept` header relay-runtime's fetch sends selects no
 * media type exactly — so the drain always fires for us.
 *
 * The route→query map still lives in THIS (native) module registry: the dev
 * bricks load `EntryServer` and the rest of the render world via
 * `ssrLoadModule`, so the deliberate double-match (one here for data, one in
 * `EntryServer` for render) crosses a registry boundary carrying only plain
 * data — see `routeQueries.ts`.
 */

import { fetchQuery, type OperationType } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { createEnvironment } from "#relay/environment.js";
import { matchRouteQuery } from "./routeQueries.js";

/** The serialised store snapshot for `initialData.relay`. */
export interface PreparedRelayData {
  readonly records: RecordMap;
}

/**
 * Marks the outgoing request as this app's own server-side traffic. The graph
 * server logs `ssr` vs `client` off it, which is what lets the e2e suite
 * prove a server-rendered first load made no BROWSER requests.
 */
const SSR_HEADERS = { "x-pragma-ssr": "1" } as const;

/**
 * Execute the matched route's query against `graphqlUrl` and serialise the
 * store. Returns `undefined` when the route maps to no query — and on any
 * failure (malformed route meta, unreachable graph, execution error),
 * logging it: the page then renders without server data and the client
 * fetches over HTTP, which is a degraded page rather than a 500.
 *
 * @note Impure — performs a network request to the graph server.
 */
export const prepareRelayData = async (
  url: string,
  graphqlUrl: string,
): Promise<PreparedRelayData | undefined> => {
  try {
    // Matching happens INSIDE the try: the collector behind `matchRouteQuery`
    // walks EVERY route's meta for every URL, so one malformed `ssrQuery`
    // entry would otherwise escape the catch and turn all server renders
    // into 500s instead of degrading to the no-server-data path below.
    const matched = matchRouteQuery(url);
    if (!matched) return undefined;
    // A dedicated per-request environment (never a shared one), so the
    // serialised snapshot contains exactly this route's data (P-2 D9).
    const environment = createEnvironment({
      graphqlUrl,
      headers: SSR_HEADERS,
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
      `[ssr] relay prepare failed for ${url} against ${graphqlUrl} — rendering without server data`,
      error,
    );
    return undefined;
  }
};
