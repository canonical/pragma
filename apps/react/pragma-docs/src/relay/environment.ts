/**
 * Relay environment factory.
 *
 * Builds the app's Relay `Environment` on top of `relay-runtime-network`'s
 * middleware-driven fetch pipeline, posting operations to the graph GraphQL
 * endpoint. Where that endpoint lives is decided in one place —
 * `graphqlEndpoint.ts` — and an explicit `graphqlUrl` overrides it.
 *
 * Three options serve the SSR data track (one factory, both runtimes):
 * `records` seeds the store from a serialised snapshot — the server render
 * and the client hydration consume the same bytes, so nothing refetches;
 * `headers` stamps the outgoing request (the prepare step marks itself
 * `x-pragma-ssr: 1` so the graph server can tell server traffic from
 * browser traffic); and `fetchFn` replaces the network wholesale, which is
 * how `entry.tsx` installs its cold-store guard.
 */

import {
  Environment,
  type FetchFunction,
  type GraphQLResponse,
  Network,
  RecordSource,
  Store,
} from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import {
  createRelayRuntimeNetwork,
  headersMiddleware,
  httpExecutor,
  persistedQueryMiddleware,
  type RelayFetchMiddleware,
  type RelayRuntimeFetch,
  urlMiddleware,
} from "relay-runtime-network";
import { resolveGraphqlUrl } from "./graphqlEndpoint.js";

/**
 * Owns the pipeline's incremental-payload stream so a failed operation cannot
 * take the process down.
 *
 * relay-runtime-network@0.1.0 gives every execution an incremental payload
 * stream whose `closed` promise it REJECTS when the pipeline throws
 * (`createFetchPipeline.js` → `failIncrementalPayloadStream` →
 * `rejectClosed`). Nothing in the library ever attaches a handler to that
 * promise, so a plain fetch failure — a graph server that is down, a refused
 * connection — surfaces as an UNHANDLED REJECTION, which Node treats as
 * fatal. The caller's own rejection is delivered separately and is handled
 * (the prepare step catches it and degrades), so this leak is pure collateral.
 *
 * The reason it appears now: until the PRD-3 process split nothing in this
 * app ever ran a FAILING request through the real HTTP pipeline — the server
 * executed in-process and the client had a live same-origin endpoint.
 *
 * This middleware runs FIRST, so the handler is attached before any later
 * middleware or the executor can throw. Marking a rejection as handled is all
 * it does; the error itself still propagates to the caller unchanged.
 */
const ownIncrementalStreamFailure: RelayFetchMiddleware =
  (next) => (context) => {
    context.incremental.stream.closed.catch(() => {});
    return next(context);
  };

/** Options for {@link createEnvironment}. */
export interface CreateEnvironmentOptions {
  /**
   * GraphQL endpoint URL. Overrides `VITE_GRAPHQL_URL` and the default (see
   * `graphqlEndpoint.ts`). Ignored when `fetchFn` is provided.
   *
   * Deliberately OPTIONAL rather than required: ~15 story and test harnesses
   * under `src/domains/**` construct an environment without one, and the
   * resolver's default is exactly right for all of them.
   */
  readonly graphqlUrl?: string;
  /**
   * Extra headers stamped onto every outgoing request. The server's prepare
   * step passes `x-pragma-ssr: 1`; the graph server reads it to distinguish
   * server-side traffic from browser traffic. Ignored when `fetchFn` is
   * provided.
   */
  readonly headers?: Record<string, string>;
  /**
   * Serialised record map to seed the store with — the output of
   * `environment.getStore().getSource().toJSON()` on the server, delivered
   * to the client via `window.__INITIAL_DATA__.relay.records`. A fully
   * walkable snapshot renders without any network request (no
   * `queryCacheExpirationTime` is configured, so restored records are never
   * considered stale).
   */
  readonly records?: RecordMap;
  /**
   * Replaces the HTTP network entirely: every operation executes through
   * this function. `entry.tsx` passes one that always rejects, so a server
   * render that misses the prepared store fails loudly in the suspended
   * boundary instead of reaching the network.
   */
  readonly fetchFn?: FetchFunction;
}

/**
 * Builds the HTTP network that posts operations to `graphqlUrl`.
 *
 * `persistedQueryMiddleware` is the pipeline's request shaper — the fetch
 * envelope starts with `body: null`, and without a body-writing middleware
 * every POST goes out empty and the server answers 400 "Missing query".
 * Our compiled artifacts carry no persisted ids, so the full-text fallback
 * always fires (`{operationName, variables, query}` + JSON content type);
 * if persisted queries ever land, this wiring upgrades to ids automatically.
 *
 * `headersMiddleware` sits AFTER `urlMiddleware` and BEFORE the request
 * shaper, on the default `"set"` merge strategy — so it overwrites only the
 * keys it names and leaves `persistedQueryMiddleware`'s content type alone.
 * ("replace" would clear every header first and break exactly that.)
 */
const createHttpNetwork = (
  graphqlUrl: string,
  headers: Record<string, string> | undefined,
) =>
  createRelayRuntimeNetwork({
    fetch: {
      executor: httpExecutor(),
      middlewares: [
        ownIncrementalStreamFailure,
        urlMiddleware({ url: graphqlUrl }),
        ...(headers ? [headersMiddleware({ headers })] : []),
        persistedQueryMiddleware({
          fallbackToFullText: true,
          mode: "manifest",
        }),
      ],
    },
  });

/**
 * Adapts the pipeline's fetch to relay-runtime's `FetchFunction`. Both
 * describe the same GraphQL response wire shape, but relay-runtime types the
 * payload as `PayloadData` where the pipeline says `unknown`, and takes its
 * cache config as an interface where the pipeline wants a plain record —
 * hence the spread and the single response cast at this library boundary.
 */
const toFetchFunction =
  (fetchGraphQL: RelayRuntimeFetch): FetchFunction =>
  (params, variables, cacheConfig) =>
    fetchGraphQL(params, variables, {
      ...cacheConfig,
    }) as Promise<GraphQLResponse>;

/**
 * The store's identity function: the graph's `uri`, never `id`.
 *
 * The converged base deleted `id` — `Node` is `{ uri: ID!  _meta: EntityMeta! }`
 * and `uri` carries the absolute IRI. relay-compiler is told this by
 * `relay.config.json`'s `schemaConfig.nodeInterfaceIdField`, but that is a
 * COMPILE-TIME knob only: it decides which field the `generate_id_field`
 * transform injects into a selection. It never reaches relay-runtime, whose
 * `defaultGetDataID` reads `fieldValue.id` unconditionally
 * (`relay-runtime/store/defaultGetDataID.js`). Without this override every
 * record would normalise to a path-based client id
 * (`client:root:component(uri:"…")`), so the store would lose stable
 * identity: no cross-query record sharing, and every captured SSR snapshot
 * keyed differently from the records a live query writes.
 *
 * Returning `undefined` for the embeddables is deliberate and correct.
 * `Property` and `ChangeLogEntry` are blank-node-only — the schema gives
 * them `_meta` but no `uri` — so Relay mints them a client id, which is
 * exactly what an unaddressable value should get.
 */
const getDataID = (fieldValue: {
  readonly [key: string]: unknown;
}): string | undefined =>
  typeof fieldValue.uri === "string" ? fieldValue.uri : undefined;

/**
 * Creates a Relay `Environment` for the app.
 *
 * Call once per browser session (module scope in the client entry) and once
 * per request on the server, so no store state leaks across requests.
 */
export const createEnvironment = (
  options: CreateEnvironmentOptions = {},
): Environment => {
  const fetchFn =
    options.fetchFn ??
    toFetchFunction(
      createHttpNetwork(
        options.graphqlUrl ?? resolveGraphqlUrl(),
        options.headers,
      ).fetch,
    );

  return new Environment({
    getDataID,
    network: Network.create(fetchFn),
    store: new Store(RecordSource.create(options.records)),
  });
};
