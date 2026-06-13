// =============================================================================
// Fetch-compatible GraphQL HTTP handler (KG.12, KG.19, KG.21).
//
// `(Request) => Promise<Response>` — same composition pattern as
// @canonical/ke's createSparqlHandler. Mostly seam, not policy: extra
// hardening arrives through options (validationRules, persistedQueries,
// introspection, hideFieldSuggestions, formatError, onOperation). On top of
// the seams it applies the hardening domain's safe defaults — query-depth
// limit (maxDepth), connection page-size clamp, IRI-injection guard, and
// production error masking (maskErrors) — each tunable or disablable.
//
// Incremental delivery: when enabled and the client accepts multipart/mixed,
// @defer/@stream responses stream as multipart parts (graphql17 or
// relay-legacy payload format); otherwise increments are drained and merged
// into one complete JSON response.
// =============================================================================

import {
  type DocumentNode,
  GraphQLError,
  type GraphQLFormattedError,
  type GraphQLSchema,
  getOperationAST,
  NoSchemaIntrospectionCustomRule,
  parse,
  specifiedRules,
  type ValidationRule,
  validate,
} from "graphql";
import {
  type CompilerContext,
  createDepthLimitRule,
  DEFAULT_MAX_QUERY_DEPTH,
  executeLocal,
  type IncrementalResults,
  isIncrementalResults,
  maskError,
  mergeIncremental,
  relayFormatAdapter,
} from "../lib/index.js";
import graphiqlHtml from "./graphiqlHtml.js";

/** One executed operation, reported through the onOperation hook. */
export interface OperationEvent {
  operation: string | null;
  duration: number;
  errors: ReadonlyArray<GraphQLFormattedError>;
  persisted: boolean;
}

/** Options for createGraphQLHandler — every policy seam the handler offers. */
export interface GraphQLHandlerOptions {
  /** Serve the GraphiQL IDE on GET without a query param. Default: dev only. */
  graphiql?: boolean;
  /** CORS headers + OPTIONS preflight. Default: false. */
  cors?: boolean;
  /** Maximum query string length. Default: 50,000 characters. */
  maxQueryLength?: number;
  /**
   * Maximum selection-set nesting depth (hardening). Default:
   * DEFAULT_MAX_QUERY_DEPTH. Set to 0 to disable. Bounds the unbounded
   * recursion that cyclic types otherwise allow.
   */
  maxDepth?: number;
  /** Per-request context factory (fresh DataLoaders per call). */
  context: (request: Request) => CompilerContext | Promise<CompilerContext>;
  /** Extra graphql-js validation rules (static or per-request). */
  validationRules?:
    | ReadonlyArray<ValidationRule>
    | ((request: Request) => ReadonlyArray<ValidationRule>);
  /** Introspection availability. Default: dev true, production false. */
  introspection?: boolean;
  /** Persisted query store (hash → query text). */
  persistedQueries?: {
    get(hash: string): string | null | Promise<string | null>;
    allowArbitraryQueries?: boolean;
  };
  /** Strip "Did you mean …" suggestions. Default: dev false, production true. */
  hideFieldSuggestions?: boolean;
  formatError?: (error: GraphQLFormattedError) => GraphQLFormattedError;
  /**
   * Mask internal/unexpected error messages (those wrapping a non-GraphQL
   * throw, e.g. a store error) with a generic message, so store/SPARQL
   * internals never reach the client. Default: production only. Deliberate
   * GraphQLErrors (validation, argument errors) always pass through.
   */
  maskErrors?: boolean;
  onOperation?: (event: OperationEvent) => void;
  /** Incremental delivery over multipart/mixed (KG.21). Default: false. */
  incremental?: boolean;
  /** Payload format for incremental parts. Default: 'graphql17'. */
  incrementalFormat?: "graphql17" | "relay-legacy";
  /**
   * Override the GraphiQL HTML. The default template loads version-pinned
   * GraphiQL UMD assets from unpkg at runtime — air-gapped deployments
   * supply their own template (e.g. with vendored assets) through this seam.
   */
  graphiqlHtml?: (endpoint: string) => string;
}

interface GraphQLRequestBody {
  query?: string;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
  extensions?: {
    persistedQuery?: { sha256Hash?: string };
  };
}

// `process` is absent on Workers/edge isolates — default to production
// hardening there (no GraphiQL, no introspection) unless options say otherwise.
const isProduction = (): boolean =>
  typeof process === "undefined" || process.env.NODE_ENV === "production";

/** Build the CORS header set ({} when CORS is disabled). */
const buildCorsHeaders = (enabled: boolean): Record<string, string> =>
  enabled
    ? {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
      }
    : {};

/**
 * Check whether the request's Accept header admits a media type. Tolerant
 * matching: media types may carry parameters (deferSpec=…, q-values). Per
 * RFC 9110, q=0 means "explicitly not acceptable".
 */
const accepts = (request: Request, mediaType: string): boolean =>
  (request.headers.get("accept") ?? "").split(",").some((part) => {
    const [type, ...params] = part.trim().split(";");
    if (type?.trim() !== mediaType) {
      return false;
    }
    const q = params
      .map((param) => param.trim())
      .find((param) => param.startsWith("q="));
    return q === undefined || Number.parseFloat(q.slice(2)) > 0;
  });

/** Strip the trailing "Did you mean …?" suggestion from an error message. */
const stripSuggestions = (
  error: GraphQLFormattedError,
): GraphQLFormattedError => ({
  ...error,
  message: error.message.replace(/ Did you mean .+\?$/, ""),
});

/**
 * Create a fetch-compatible GraphQL HTTP handler over a compiled schema:
 * GraphQL-over-HTTP (GET with query param, POST JSON, persisted-query
 * extension), optional GraphiQL, CORS preflight, validation-rule and
 * persisted-query seams, and incremental delivery over multipart/mixed.
 * The handler is a plain `(Request) => Promise<Response>` — no framework.
 *
 * @note Impure — the returned handler performs request/response I/O and
 * executes operations against the store-backed context.
 */
export default function createGraphQLHandler(
  schema: GraphQLSchema,
  options: GraphQLHandlerOptions,
): (request: Request) => Promise<Response> {
  const graphiqlEnabled = options.graphiql ?? !isProduction();
  const introspectionEnabled = options.introspection ?? !isProduction();
  const hideSuggestions = options.hideFieldSuggestions ?? isProduction();
  const maxQueryLength = options.maxQueryLength ?? 50_000;
  // Depth-limit rule (hardening): built once, reused across requests. 0 = off.
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_QUERY_DEPTH;
  const depthRule = maxDepth > 0 ? createDepthLimitRule(maxDepth) : undefined;
  // Mask internal error messages in production (hardening) unless overridden.
  const shouldMaskErrors = options.maskErrors ?? isProduction();
  const allowArbitrary =
    options.persistedQueries?.allowArbitraryQueries ?? !isProduction();

  const formatOne = (error: GraphQLFormattedError): GraphQLFormattedError => {
    const stripped = hideSuggestions ? stripSuggestions(error) : error;
    return options.formatError ? options.formatError(stripped) : stripped;
  };

  // Execution errors: mask internal ones (hardening) before stripping
  // suggestions and applying the consumer's formatError. Validation errors
  // (a separate, always-safe path) keep using formatOne directly.
  const formatExecutionError = (
    error: GraphQLError | GraphQLFormattedError,
  ): GraphQLFormattedError =>
    formatOne(
      error instanceof GraphQLError
        ? maskError(error, shouldMaskErrors)
        : error,
    );

  const buildJsonResponse = (
    body: unknown,
    status: number,
    cors: boolean,
    contentType = "application/json",
  ): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": contentType, ...buildCorsHeaders(cors) },
    });

  const buildErrorResponse = (
    message: string,
    status: number,
    cors: boolean,
  ): Response =>
    buildJsonResponse({ errors: [formatOne({ message })] }, status, cors);

  // Parsed-document cache: query texts repeat (persisted queries, Relay
  // clients re-sending the same operations) — parsing is the dominant cost
  // of warm requests. Bounded; validation still runs per request (rules may
  // be per-request).
  const documentCache = new Map<string, DocumentNode>();
  const DOCUMENT_CACHE_LIMIT = 500;

  return async (request: Request): Promise<Response> => {
    const cors = options.cors ?? false;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(cors),
      });
    }

    // ── parse the GraphQL request ──
    let body: GraphQLRequestBody;
    if (request.method === "GET") {
      const url = new URL(request.url);
      const query = url.searchParams.get("query");
      if (!query) {
        if (graphiqlEnabled && accepts(request, "text/html")) {
          const template = options.graphiqlHtml ?? graphiqlHtml;
          return new Response(template(url.pathname), {
            status: 200,
            headers: { "Content-Type": "text/html", ...buildCorsHeaders(cors) },
          });
        }
        return buildErrorResponse("Missing query parameter", 400, cors);
      }
      let variables: Record<string, unknown> | null = null;
      const rawVariables = url.searchParams.get("variables");
      if (rawVariables) {
        try {
          variables = JSON.parse(rawVariables) as Record<string, unknown>;
        } catch {
          return buildErrorResponse("Invalid variables JSON", 400, cors);
        }
      }
      body = {
        query,
        variables,
        operationName: url.searchParams.get("operationName"),
      };
    } else if (request.method === "POST") {
      try {
        body = (await request.json()) as GraphQLRequestBody;
      } catch {
        return buildErrorResponse("Invalid JSON body", 400, cors);
      }
    } else {
      return buildErrorResponse("Method not allowed", 405, cors);
    }

    // ── persisted queries ──
    let persisted = false;
    let queryText = body.query;
    const hash = body.extensions?.persistedQuery?.sha256Hash;
    if (hash && options.persistedQueries) {
      const stored = await options.persistedQueries.get(hash);
      if (stored) {
        queryText = stored;
        persisted = true;
      } else if (!queryText) {
        return buildJsonResponse(
          { errors: [formatOne({ message: "PersistedQueryNotFound" })] },
          200,
          cors,
        );
      }
    }
    if (!queryText) {
      return buildErrorResponse("Missing query", 400, cors);
    }
    if (!persisted && !allowArbitrary && options.persistedQueries) {
      return buildErrorResponse(
        "Only persisted queries are accepted",
        400,
        cors,
      );
    }
    if (queryText.length > maxQueryLength) {
      return buildErrorResponse(
        `Query exceeds maximum length of ${maxQueryLength}`,
        413,
        cors,
      );
    }

    // ── parse + validate ──
    let document: DocumentNode;
    const cached = documentCache.get(queryText);
    try {
      if (cached) {
        document = cached;
      } else {
        document = parse(queryText);
        if (documentCache.size >= DOCUMENT_CACHE_LIMIT) {
          documentCache.clear();
        }
        documentCache.set(queryText, document);
      }
    } catch (error) {
      return buildJsonResponse(
        {
          errors: [
            formatOne(
              error instanceof GraphQLError
                ? error.toJSON()
                : { message: String(error) },
            ),
          ],
        },
        400,
        cors,
      );
    }

    const customRules =
      typeof options.validationRules === "function"
        ? options.validationRules(request)
        : (options.validationRules ?? []);
    const rules: ValidationRule[] = [...specifiedRules, ...customRules];
    if (!introspectionEnabled) {
      rules.push(NoSchemaIntrospectionCustomRule);
    }
    if (depthRule) {
      rules.push(depthRule);
    }
    const validationErrors = validate(schema, document, rules);
    if (validationErrors.length > 0) {
      return buildJsonResponse(
        { errors: validationErrors.map((e) => formatOne(e.toJSON())) },
        400,
        cors,
      );
    }

    // ── execute ──
    const started = Date.now();
    const contextValue = await options.context(request);
    const result = await executeLocal({
      schema,
      source: queryText,
      // Reuse the parsed+validated document — no second parse on the warm path.
      document,
      variableValues: body.variables ?? undefined,
      contextValue,
      operationName: body.operationName ?? undefined,
    });

    const operationName =
      body.operationName ??
      getOperationAST(document, body.operationName ?? undefined)?.name?.value ??
      null;

    const report = (errors: ReadonlyArray<GraphQLFormattedError>) =>
      options.onOperation?.({
        operation: operationName,
        duration: Date.now() - started,
        errors,
        persisted,
      });

    // ── respond ──
    if (isIncrementalResults(result)) {
      const wantsMultipart =
        (options.incremental ?? false) && accepts(request, "multipart/mixed");
      if (!wantsMultipart) {
        const merged = await mergeIncremental(result);
        const errors = (merged.errors ?? []).map((e) =>
          formatExecutionError(e as GraphQLError | GraphQLFormattedError),
        );
        report(errors);
        return buildJsonResponse(
          errors.length > 0
            ? { data: merged.data, errors }
            : { data: merged.data },
          200,
          cors,
        );
      }
      report([]);
      return buildMultipartResponse(
        result,
        options.incrementalFormat ?? "graphql17",
        cors,
      );
    }

    const errors = (result.errors ?? []).map(formatExecutionError);
    report(errors);
    return buildJsonResponse(
      errors.length > 0 ? { ...result, errors } : result,
      200,
      cors,
    );
  };

  /**
   * Build a multipart/mixed streaming response from incremental results.
   *
   * @note Impure — streams the incremental payloads as they resolve.
   */
  function buildMultipartResponse(
    results: IncrementalResults,
    format: "graphql17" | "relay-legacy",
    cors: boolean,
  ): Response {
    const boundary = "graphql";
    const encoder = new TextEncoder();
    const encodePart = (payload: unknown): Uint8Array =>
      encoder.encode(
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}`,
      );

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (format === "relay-legacy") {
            for await (const payload of relayFormatAdapter(results)) {
              controller.enqueue(encodePart(payload));
            }
          } else {
            controller.enqueue(encodePart(results.initialResult));
            for await (const payload of results.subsequentResults) {
              controller.enqueue(encodePart(payload));
            }
          }
          controller.enqueue(encoder.encode(`\r\n--${boundary}--\r\n`));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": `multipart/mixed; boundary="${boundary}"`,
        ...buildCorsHeaders(cors),
      },
    });
  }
}
