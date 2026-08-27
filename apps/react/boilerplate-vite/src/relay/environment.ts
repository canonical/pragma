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
  createOperationDescriptor,
  Environment,
  type FetchFunction,
  type GraphQLResponse,
  type GraphQLTaggedNode,
  getRequest,
  Network,
  type PayloadData,
  RecordSource,
  Store,
} from "relay-runtime";
import {
  createRelayRuntimeNetwork,
  httpExecutor,
  localGraphExecutor,
  type RelayFetchContext,
  type RelayRuntimeFetch,
  urlMiddleware,
} from "relay-runtime-network";

/**
 * A server-captured operation ready to replay: the resolved query node plus
 * the variables and raw response `data` captured when the server executed it.
 */
export interface RelaySeedPayload {
  readonly query: GraphQLTaggedNode;
  readonly variables: Record<string, unknown>;
  readonly data: Record<string, unknown>;
}

/** A response observed by the network, in the serializable wire shape. */
export interface CapturedResponse {
  readonly id: string;
  readonly variables: Record<string, unknown>;
  readonly data: Record<string, unknown>;
}

/** Options for {@link createEnvironment}. */
export interface CreateEnvironmentOptions {
  /**
   * GraphQL endpoint URL. Overrides the `VITE_GRAPHQL_URL` env var; when
   * neither is set the environment executes against the local mock schema.
   */
  readonly graphqlUrl?: string;
  /**
   * Server-captured operations replayed into the store at construction via
   * Relay's public `commitPayload` — only these operations' data ever crosses
   * the SSR boundary (no whole-store serialization, nothing to scrub). Each
   * replayed operation is retained, so the seeded data cannot be GC'd before
   * its first reader mounts.
   */
  readonly payloads?: readonly RelaySeedPayload[];
  /**
   * Observe each successful single response the environment's network
   * returns. The SSR prefetch uses this to tee responses into the
   * serializable payload list while `fetchQuery` normalizes them as usual.
   */
  readonly captureResponse?: (captured: CapturedResponse) => void;
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
  const graphqlUrl = options.graphqlUrl ?? readConfiguredGraphqlUrl();
  const network = graphqlUrl
    ? createHttpNetwork(graphqlUrl)
    : createLocalNetwork();

  // toFetchFunction always yields a promise (see its cast); the narrower
  // alias lets the capture wrapper await it without widening back into
  // FetchFunction's observable-bearing return union.
  const baseFetch = toFetchFunction(network.fetch) as (
    ...args: Parameters<FetchFunction>
  ) => Promise<GraphQLResponse>;
  const capture = options.captureResponse;
  const fetchFn: FetchFunction = capture
    ? async (params, variables, cacheConfig, uploadables) => {
        const response = await baseFetch(
          params,
          variables,
          cacheConfig,
          uploadables,
        );
        // Batched responses are never produced by either executor; capture
        // only well-formed single responses that carry data and a name.
        if (
          !Array.isArray(response) &&
          "data" in response &&
          response.data &&
          params.name
        ) {
          capture({
            id: params.name,
            variables,
            data: response.data as unknown as Record<string, unknown>,
          });
        }

        return response;
      }
    : baseFetch;

  const environment = new Environment({
    network: Network.create(fetchFn),
    store: new Store(new RecordSource()),
  });

  for (const seed of options.payloads ?? []) {
    const operation = createOperationDescriptor(
      getRequest(seed.query),
      seed.variables,
    );

    environment.commitPayload(operation, seed.data as PayloadData);
    // Explicit retention — seeded data must survive until its first reader
    // mounts and takes over the retain; no reliance on GC timing.
    environment.retain(operation);
  }

  return environment;
};

let browserEnvironment: Environment | null = null;

/**
 * The browser-session Relay environment, created lazily on first use.
 *
 * Module scope so the client entry's provider and route-level `warm` hooks
 * share one normalized store — a navigation-time cache warm lands in the same
 * store `useLazyLoadQuery` reads from. The FIRST caller's options win (the
 * client entry seeds SSR payloads before anything else runs); later calls
 * reuse the existing environment. Server code must keep using
 * `createEnvironment()` (fresh per request).
 */
export const getBrowserEnvironment = (
  options?: CreateEnvironmentOptions,
): Environment => {
  browserEnvironment ??= createEnvironment(options);

  return browserEnvironment;
};
