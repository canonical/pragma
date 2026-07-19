/**
 * Relay environment factory.
 *
 * Builds the app's Relay `Environment` on top of `relay-runtime-network`'s
 * middleware-driven fetch pipeline, posting operations to the graph GraphQL
 * endpoint. The default is the same-origin `/graphql` mounted by the dev
 * servers (see `src/server/graphql.ts`); `VITE_GRAPHQL_URL` (or an explicit
 * `graphqlUrl`) points it elsewhere.
 *
 * The server render never fetches through this environment today: query
 * components sit behind `ClientOnly` until the P-2 SSR data-hydration track
 * lands, so the per-request server environment stays empty by construction.
 */

import {
  Environment,
  type FetchFunction,
  type GraphQLResponse,
  Network,
  RecordSource,
  Store,
} from "relay-runtime";
import {
  createRelayRuntimeNetwork,
  httpExecutor,
  type RelayRuntimeFetch,
  urlMiddleware,
} from "relay-runtime-network";

/** The same-origin endpoint the dev servers mount. */
const DEFAULT_GRAPHQL_URL = "/graphql";

/** Options for {@link createEnvironment}. */
export interface CreateEnvironmentOptions {
  /**
   * GraphQL endpoint URL. Overrides the `VITE_GRAPHQL_URL` env var; when
   * neither is set the same-origin `/graphql` endpoint is used.
   */
  readonly graphqlUrl?: string;
}

/** Reads the endpoint URL from Vite's env, treating the empty string as unset. */
const readConfiguredGraphqlUrl = (): string | undefined => {
  const configured: unknown = import.meta.env.VITE_GRAPHQL_URL;
  return typeof configured === "string" && configured.length > 0
    ? configured
    : undefined;
};

/** Builds the HTTP network that posts operations to `graphqlUrl`. */
const createHttpNetwork = (graphqlUrl: string) =>
  createRelayRuntimeNetwork({
    fetch: {
      executor: httpExecutor(),
      middlewares: [urlMiddleware({ url: graphqlUrl })],
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
  const graphqlUrl =
    options.graphqlUrl ?? readConfiguredGraphqlUrl() ?? DEFAULT_GRAPHQL_URL;
  const network = createHttpNetwork(graphqlUrl);

  return new Environment({
    network: Network.create(toFetchFunction(network.fetch)),
    store: new Store(new RecordSource()),
  });
};
