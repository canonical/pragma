/**
 * Relay environment factory.
 *
 * Builds the app's Relay `Environment` on top of `relay-runtime-network`'s
 * middleware-driven fetch pipeline, posting operations to the graph GraphQL
 * endpoint. The default is the same-origin `/graphql` mounted by the dev
 * servers (see `src/server/graphql.ts`); `VITE_GRAPHQL_URL` (or an explicit
 * `graphqlUrl`) points it elsewhere.
 *
 * Two options serve the P-2 SSR data track (one factory, both runtimes):
 * `records` seeds the store from a serialised snapshot — the server render
 * and the client hydration consume the same bytes, so nothing refetches —
 * and `fetchFn` replaces the HTTP network wholesale so the server's prepare
 * step executes operations in-process through `executeLocal`.
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
  httpExecutor,
  persistedQueryMiddleware,
  type RelayRuntimeFetch,
  urlMiddleware,
} from "relay-runtime-network";

/** The same-origin endpoint the dev servers mount. */
const DEFAULT_GRAPHQL_URL = "/graphql";

/** Options for {@link createEnvironment}. */
export interface CreateEnvironmentOptions {
  /**
   * GraphQL endpoint URL. Overrides the `VITE_GRAPHQL_URL` env var; when
   * neither is set the same-origin `/graphql` endpoint is used. Ignored when
   * `fetchFn` is provided.
   */
  readonly graphqlUrl?: string;
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
   * this function. The server bricks pass an adapter over the in-process
   * ke-graphql backend so the prepare step never leaves the process.
   */
  readonly fetchFn?: FetchFunction;
}

/**
 * Reads the endpoint URL from Vite's env, treating the empty string as unset.
 * `import.meta.env` is optional-chained because its presence depends on the
 * runtime: under node/tsx (the server bricks import this factory natively,
 * no Vite transform) it is undefined and the `?.` is load-bearing; under Bun
 * native it IS defined (Bun populates it from `process.env`); under Vite the
 * whole `?.` expression is statically replaced, so the chain costs nothing
 * there either.
 */
const readConfiguredGraphqlUrl = (): string | undefined => {
  const configured: unknown = import.meta.env?.VITE_GRAPHQL_URL;
  return typeof configured === "string" && configured.length > 0
    ? configured
    : undefined;
};

/**
 * Builds the HTTP network that posts operations to `graphqlUrl`.
 *
 * `persistedQueryMiddleware` is the pipeline's request shaper — the fetch
 * envelope starts with `body: null`, and without a body-writing middleware
 * every POST goes out empty and the server answers 400 "Missing query".
 * Our compiled artifacts carry no persisted ids, so the full-text fallback
 * always fires (`{operationName, variables, query}` + JSON content type);
 * if persisted queries ever land, this wiring upgrades to ids automatically.
 */
const createHttpNetwork = (graphqlUrl: string) =>
  createRelayRuntimeNetwork({
    fetch: {
      executor: httpExecutor(),
      middlewares: [
        urlMiddleware({ url: graphqlUrl }),
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
        options.graphqlUrl ?? readConfiguredGraphqlUrl() ?? DEFAULT_GRAPHQL_URL,
      ).fetch,
    );

  return new Environment({
    network: Network.create(fetchFn),
    store: new Store(RecordSource.create(options.records)),
  });
};
