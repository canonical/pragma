// =============================================================================
// @canonical/ke/http — Composable SPARQL Protocol HTTP handler
//
// This module provides a fetch-compatible HTTP handler that implements the
// W3C SPARQL Protocol (https://www.w3.org/TR/sparql11-protocol/).
//
// Design principle: ke provides the handler, consumer brings the server.
// This is the same pattern as Hono (router, not server). The handler is a
// plain function `(Request) => Promise<Response>` that works with any
// server runtime: Bun.serve, Deno.serve, Node http, Cloudflare Workers, etc.
//
// Security model: The HTTP handler passes raw SPARQL directly to the store
// WITHOUT injection escaping. This is intentional — the handler is a trusted
// endpoint. The consumer controls who can reach it via their server config
// (network binding, auth middleware, etc.). The `sparql` tagged template's
// escaping is for application-level interpolation, not protocol-level access.
//
// This is a future sub-path export (`@canonical/ke/http`) described in
// A.TRANSFER as "when someone wants a SPARQL endpoint."
// =============================================================================

import type { Store } from "../lib/types.js";

/** Configuration options for the SPARQL HTTP handler. */
export interface SparqlHandlerOptions {
  /**
   * Enable CORS headers on all responses and handle OPTIONS preflight.
   * Default: false. Enable when the handler is accessed from browser origins.
   */
  cors?: boolean;

  /**
   * Maximum allowed query string length in characters.
   * Queries exceeding this limit are rejected with HTTP 400.
   * Default: 10,000 characters. Adjust based on your dataset complexity.
   */
  maxQueryLength?: number;
}

const DEFAULT_MAX_QUERY_LENGTH = 10_000;

/** Standard CORS headers for cross-origin browser access. */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

/**
 * Create a composable SPARQL Protocol HTTP handler.
 *
 * Returns a standard fetch handler `(Request) => Promise<Response>` that
 * implements the W3C SPARQL Protocol for query operations:
 *
 * - `GET /sparql?query=SELECT...` — query in URL parameter
 * - `POST` with `Content-Type: application/sparql-query` — query in body
 * - `POST` with `Content-Type: application/x-www-form-urlencoded` — query= in form body
 * - `OPTIONS` — CORS preflight (when cors option is enabled)
 *
 * All successful queries return `Content-Type: application/sparql-results+json`
 * with the ke QueryResult JSON (same shape as `store.query()` returns).
 *
 * @note Impure — handles HTTP requests, delegates to store.query().
 *
 * @example
 * ```ts
 * import { createStore } from "@canonical/ke";
 * import { createSparqlHandler } from "@canonical/ke/http";
 *
 * const store = await createStore({ sources: ["./data.ttl"] });
 * const handler = createSparqlHandler(store, { cors: true });
 *
 * // Bun
 * Bun.serve({ fetch: handler, port: 3030 });
 *
 * // Deno
 * Deno.serve({ port: 3030 }, handler);
 *
 * // Node (via adapter)
 * // ... wrap handler with your preferred Node HTTP adapter
 * ```
 */
export default function createSparqlHandler(
  store: Store,
  options: SparqlHandlerOptions = {},
): (request: Request) => Promise<Response> {
  const maxLen = options.maxQueryLength ?? DEFAULT_MAX_QUERY_LENGTH;
  const cors = options.cors ?? false;

  /** Build response headers, optionally including CORS headers. */
  function buildHeaders(contentType: string): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": contentType };
    if (cors) {
      Object.assign(headers, CORS_HEADERS);
    }
    return headers;
  }

  /** Build a JSON error response with the given HTTP status code. */
  function buildErrorResponse(status: number, message: string): Response {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: buildHeaders("application/json"),
    });
  }

  /**
   * Extract the SPARQL query string from the request.
   * Supports three SPARQL Protocol transport methods:
   * 1. GET with ?query= parameter
   * 2. POST with application/sparql-query body (raw SPARQL)
   * 3. POST with application/x-www-form-urlencoded body (query= field)
   */
  async function extractQuery(request: Request): Promise<string | null> {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return url.searchParams.get("query");
    }

    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") ?? "";

      // Direct SPARQL query in the POST body
      if (contentType.includes("application/sparql-query")) {
        return await request.text();
      }

      // URL-encoded form with a query= field
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const body = await request.text();
        const params = new URLSearchParams(body);
        return params.get("query");
      }
    }

    return null;
  }

  // Return the fetch-compatible handler function
  return async (request: Request): Promise<Response> => {
    // Handle CORS preflight
    if (cors && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildHeaders("text/plain"),
      });
    }

    // Only GET and POST are supported by the SPARQL Protocol
    if (request.method !== "GET" && request.method !== "POST") {
      return buildErrorResponse(405, "Method not allowed");
    }

    // Extract query from the request
    const query = await extractQuery(request);

    if (!query) {
      return buildErrorResponse(400, "Missing query parameter");
    }

    // Enforce query length limit (DoS protection)
    if (query.length > maxLen) {
      return buildErrorResponse(
        400,
        `Query exceeds maximum length of ${maxLen}`,
      );
    }

    try {
      // Raw SPARQL passthrough — no escaping. The HTTP handler is a trusted
      // endpoint; the consumer controls access via their server config.
      // The branded SPARQL type is bypassed here via cast.
      const result = await store.query(
        query as import("../lib/types.js").SPARQL,
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: buildHeaders("application/sparql-results+json"),
      });
    } catch (error) {
      // Query execution errors (parse errors, unknown functions, etc.)
      // are returned as HTTP 400 with the error message
      const message =
        error instanceof Error ? error.message : "Query execution failed";
      return buildErrorResponse(400, message);
    }
  };
}
