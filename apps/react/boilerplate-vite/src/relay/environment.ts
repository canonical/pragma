/**
 * Relay environment factory.
 *
 * Builds the app's Relay `Environment` on top of `relay-runtime-network`'s
 * middleware-driven fetch pipeline, in one of two modes:
 *
 * - **local (default)** — a `localGraphExecutor` resolves every operation
 *   in-process against the mock catalog schema (`./schema.ts`), so the
 *   boilerplate runs with zero backend.
 * - **endpoint** — when `VITE_GRAPHQL_URL` is set (or a URL is passed
 *   explicitly), an `httpExecutor` + `urlMiddleware` posts operations to a
 *   real GraphQL server.
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
  localGraphExecutor,
  persistedQueryMiddleware,
  type RelayFetchContext,
  type RelayRuntimeFetch,
  urlMiddleware,
} from "relay-runtime-network";

/** Options for {@link createEnvironment}. */
export interface CreateEnvironmentOptions {
  /**
   * GraphQL endpoint URL. Overrides the `VITE_GRAPHQL_URL` env var; when
   * neither is set the environment executes against the local mock schema.
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

/**
 * Builds the in-process network that executes against the mock schema.
 *
 * The schema module (and its `graphql` dependency) is loaded lazily inside
 * the executor — `execute` already returns a promise, so the dynamic import
 * adds no async boundary — keeping graphql-js and the mock catalog out of
 * the main bundle, and unparsed, whenever the endpoint path is taken.
 */
const createLocalNetwork = () =>
  createRelayRuntimeNetwork({
    fetch: {
      executor: localGraphExecutor({
        execute: async (context: RelayFetchContext) => {
          const { text } = context.operation;
          if (!text) {
            throw new Error(
              "The local mock schema requires full operation text; persisted queries are not supported.",
            );
          }
          const { executeLocalOperation } = await import("./schema.js");
          return executeLocalOperation({
            text,
            variables: context.variables,
          });
        },
      }),
    },
  });

/**
 * Builds the HTTP network that posts operations to `graphqlUrl`.
 *
 * `persistedQueryMiddleware` is the pipeline's request shaper — the fetch
 * envelope starts with `body: null`, and without a body-writing middleware
 * every POST goes out empty and the server answers 400 "Missing query".
 * Full-text fallback always fires today (no persisted ids); the wiring
 * upgrades to ids automatically if they ever land.
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
  const graphqlUrl = options.graphqlUrl ?? readConfiguredGraphqlUrl();
  const network = graphqlUrl
    ? createHttpNetwork(graphqlUrl)
    : createLocalNetwork();

  return new Environment({
    network: Network.create(toFetchFunction(network.fetch)),
    store: new Store(new RecordSource()),
  });
};
