import type { Store } from "../lib/types.js";

export interface SparqlHandlerOptions {
  cors?: boolean;
  maxQueryLength?: number;
}

const DEFAULT_MAX_QUERY_LENGTH = 10_000;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

/**
 * Create a composable SPARQL Protocol HTTP handler.
 *
 * Returns a fetch-compatible handler (Request → Response).
 * Consumer brings the server (Bun.serve, Deno.serve, etc.).
 *
 * Supports:
 * - GET with `?query=` parameter
 * - POST with `application/sparql-query` body
 * - POST with `application/x-www-form-urlencoded` body (`query=` field)
 * - Content negotiation: `application/sparql-results+json` (default)
 * - CORS preflight when enabled
 *
 * @note Impure — handles HTTP requests, delegates to store.query().
 *
 * @example
 * ```ts
 * import { createStore } from "@canonical/ke";
 * import createSparqlHandler from "@canonical/ke/http";
 *
 * const store = await createStore({ sources: ["./data.ttl"] });
 * const handler = createSparqlHandler(store, { cors: true });
 *
 * Bun.serve({ fetch: handler, port: 3030 });
 * ```
 */
export default function createSparqlHandler(
  store: Store,
  options: SparqlHandlerOptions = {},
): (request: Request) => Promise<Response> {
  const maxLen = options.maxQueryLength ?? DEFAULT_MAX_QUERY_LENGTH;
  const cors = options.cors ?? false;

  function buildHeaders(contentType: string): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": contentType };
    if (cors) {
      Object.assign(headers, CORS_HEADERS);
    }
    return headers;
  }

  function buildErrorResponse(status: number, message: string): Response {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: buildHeaders("application/json"),
    });
  }

  async function extractQuery(request: Request): Promise<string | null> {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return url.searchParams.get("query");
    }

    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") ?? "";

      if (contentType.includes("application/sparql-query")) {
        return await request.text();
      }

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const body = await request.text();
        const params = new URLSearchParams(body);
        return params.get("query");
      }
    }

    return null;
  }

  return async (request: Request): Promise<Response> => {
    if (cors && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildHeaders("text/plain"),
      });
    }

    if (request.method !== "GET" && request.method !== "POST") {
      return buildErrorResponse(405, "Method not allowed");
    }

    const query = await extractQuery(request);

    if (!query) {
      return buildErrorResponse(400, "Missing query parameter");
    }

    if (query.length > maxLen) {
      return buildErrorResponse(
        400,
        `Query exceeds maximum length of ${maxLen}`,
      );
    }

    try {
      // Raw SPARQL passthrough — no escaping. The HTTP handler is a trusted
      // endpoint; the consumer controls access via their server config.
      const result = await store.query(
        query as import("../lib/types.js").SPARQL,
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: buildHeaders("application/sparql-results+json"),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Query execution failed";
      return buildErrorResponse(400, message);
    }
  };
}
