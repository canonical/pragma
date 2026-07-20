/**
 * Relay environment factory for the ontology projection.
 *
 * Builds a Relay `Environment` in one of two modes:
 *
 * - **local (default)** — every operation is resolved in-process against the
 *   mock ontology schema (`./schema.ts`), so the projection runs with no
 *   backend. This is the runtime counterpart to the compiler pointing at
 *   `schema.graphql`.
 * - **endpoint** — when `VITE_GRAPHQL_URL` is set (or a URL is passed), the
 *   fetch posts operations to a real GraphQL server instead.
 *
 * Storybook does not use this factory: the `@canonical/storybook-addon-relay`
 * decorator supplies a `relay-test-utils` mock environment per story. This
 * exists so `OntologyGraph` can also run in a real application.
 */

import {
  Environment,
  type FetchFunction,
  type GraphQLResponse,
  Network,
  RecordSource,
  Store,
} from "relay-runtime";
import { executeLocalOperation } from "./schema.js";

/** Options for {@link createExperimentsEnvironment}. */
export interface CreateExperimentsEnvironmentOptions {
  /**
   * GraphQL endpoint URL. Overrides `VITE_GRAPHQL_URL`; when neither is set the
   * environment executes against the local mock schema.
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

/** Fetch that resolves operations in-process against the mock ontology schema. */
const createLocalFetch = (): FetchFunction => async (params, variables) => {
  if (!params.text) {
    throw new Error(
      "The local mock schema requires full operation text; persisted queries are not supported.",
    );
  }
  const result = await executeLocalOperation({ text: params.text, variables });
  return result as unknown as GraphQLResponse;
};

/** Fetch that posts operations to a real GraphQL endpoint. */
const createHttpFetch =
  (graphqlUrl: string): FetchFunction =>
  async (params, variables) => {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: params.text, variables }),
    });
    return (await response.json()) as GraphQLResponse;
  };

/**
 * Creates a Relay `Environment`. Call once per browser session (module scope in
 * a client entry) and once per request on a server, so no store state leaks
 * across requests.
 */
export const createExperimentsEnvironment = (
  options: CreateExperimentsEnvironmentOptions = {},
): Environment => {
  const graphqlUrl = options.graphqlUrl ?? readConfiguredGraphqlUrl();
  const fetchFn = graphqlUrl ? createHttpFetch(graphqlUrl) : createLocalFetch();

  return new Environment({
    network: Network.create(fetchFn),
    store: new Store(new RecordSource()),
  });
};
