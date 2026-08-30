// =============================================================================
// A fetch-native GraphQL endpoint of this provider's own.
//
// DELIBERATELY NOT ke-graphql's createGraphQLHandler. That one is 505 lines
// and imports the other graphql major pinned in this repo, so reusing it would
// put two graphql instances in one process — and it would also contradict the
// premise, which is that implementing this contract does not require pragma's
// machinery. This is the whole of what the contract needs: POST JSON, execute,
// respond. No persisted queries, no depth limiting, no incremental delivery,
// no error masking.
// =============================================================================

import { graphql } from "graphql";
import type { ExampleProvider } from "../provider/index.js";
import graphiqlHtml from "./graphiqlHtml.js";

/** Options for {@link createExampleHandler}. */
export interface ExampleHandlerOptions {
  /** Serve GraphiQL on GET. Defaults to on outside production. */
  readonly graphiql?: boolean;
  /** Send permissive CORS headers. Defaults to on outside production. */
  readonly cors?: boolean;
  /** Endpoint URL baked into the GraphiQL page. Defaults to `"/graphql"`. */
  readonly endpoint?: string;
}

/** The JSON body of a GraphQL-over-HTTP POST. */
interface GraphQLRequestBody {
  query?: string;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
}

// `process` is absent on Workers/edge isolates — default to the hardened
// posture there, exactly as ke-graphql's handler does.
const isProduction = (): boolean =>
  typeof process === "undefined" || process.env.NODE_ENV === "production";

const corsHeaders = (enabled: boolean): Record<string, string> =>
  enabled
    ? {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
      }
    : {};

/**
 * Create a `(Request) => Promise<Response>` serving `provider`. No framework,
 * no adapter: the platform's own fetch types are the whole interface.
 *
 * @note Impure — the returned handler performs request/response I/O.
 */
export const createExampleHandler = (
  provider: ExampleProvider,
  options: ExampleHandlerOptions = {},
): ((request: Request) => Promise<Response>) => {
  const graphiqlEnabled = options.graphiql ?? !isProduction();
  const corsEnabled = options.cors ?? !isProduction();
  const endpoint = options.endpoint ?? "/graphql";
  const cors = corsHeaders(corsEnabled);

  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET") {
      return graphiqlEnabled
        ? new Response(graphiqlHtml(endpoint), {
            status: 200,
            headers: { ...cors, "Content-Type": "text/html; charset=utf-8" },
          })
        : new Response("Not Found", { status: 404, headers: cors });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: cors });
    }

    const body = (await request
      .json()
      .catch(() => null)) as GraphQLRequestBody | null;
    if (body === null || typeof body.query !== "string") {
      return Response.json(
        {
          errors: [{ message: "Expected a JSON body with a `query` string." }],
        },
        { status: 400, headers: cors },
      );
    }

    const result = await graphql({
      schema: provider.schema,
      source: body.query,
      rootValue: provider.rootValue,
      variableValues: body.variables ?? undefined,
      operationName: body.operationName ?? undefined,
    });
    return Response.json(result, { status: 200, headers: cors });
  };
};
