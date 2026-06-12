// =============================================================================
// Fetch-compatible GraphQL HTTP handler (KG.12, KG.19, KG.21).
//
// `(Request) => Promise<Response>` — same composition pattern as
// @canonical/ke's createSparqlHandler. Seam, not policy: hardening arrives
// through options (validationRules, persistedQueries, introspection,
// hideFieldSuggestions, formatError, onOperation); the handler implements
// no policy of its own.
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
import type { CompilerContext } from "../compiler/types.js";
import {
  executeLocal,
  type IncrementalResults,
  isIncrementalResults,
  mergeIncremental,
  relayFormatAdapter,
} from "../execution/incremental.js";
import { graphiqlHtml } from "./graphiql.js";

export interface OperationEvent {
  operation: string | null;
  duration: number;
  errors: ReadonlyArray<GraphQLFormattedError>;
  persisted: boolean;
}

export interface GraphQLHandlerOptions {
  /** Serve the GraphiQL IDE on GET without a query param. Default: dev only. */
  graphiql?: boolean;
  /** CORS headers + OPTIONS preflight. Default: false. */
  cors?: boolean;
  /** Maximum query string length. Default: 50,000 characters. */
  maxQueryLength?: number;
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
  onOperation?: (event: OperationEvent) => void;
  /** Incremental delivery over multipart/mixed (KG.21). Default: false. */
  incremental?: boolean;
  /** Payload format for incremental parts. Default: 'graphql17'. */
  incrementalFormat?: "graphql17" | "relay-legacy";
  /**
   * Override the GraphiQL HTML. The default template loads the GraphiQL
   * assets from esm.sh at runtime — air-gapped deployments supply their
   * own template (e.g. with vendored assets) through this seam.
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

const isProduction = (): boolean => process.env.NODE_ENV === "production";

const corsHeaders = (enabled: boolean): Record<string, string> =>
  enabled
    ? {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
      }
    : {};

/**
 * Tolerant Accept matching: media types may carry parameters (deferSpec=…,
 * q-values). Per RFC 9110, q=0 means "explicitly not acceptable".
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

const stripSuggestions = (
  error: GraphQLFormattedError,
): GraphQLFormattedError => ({
  ...error,
  message: error.message.replace(/ Did you mean .+\?$/, ""),
});

export const createGraphQLHandler = (
  schema: GraphQLSchema,
  options: GraphQLHandlerOptions,
): ((request: Request) => Promise<Response>) => {
  const graphiqlEnabled = options.graphiql ?? !isProduction();
  const introspectionEnabled = options.introspection ?? !isProduction();
  const hideSuggestions = options.hideFieldSuggestions ?? isProduction();
  const maxQueryLength = options.maxQueryLength ?? 50_000;
  const allowArbitrary =
    options.persistedQueries?.allowArbitraryQueries ?? !isProduction();

  const formatOne = (error: GraphQLFormattedError): GraphQLFormattedError => {
    const stripped = hideSuggestions ? stripSuggestions(error) : error;
    return options.formatError ? options.formatError(stripped) : stripped;
  };

  const json = (
    body: unknown,
    status: number,
    cors: boolean,
    contentType = "application/json",
  ): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": contentType, ...corsHeaders(cors) },
    });

  const errorResponse = (
    message: string,
    status: number,
    cors: boolean,
  ): Response => json({ errors: [formatOne({ message })] }, status, cors);

  // Parsed-document cache: query texts repeat (persisted queries, Relay
  // clients re-sending the same operations) — parsing is the dominant cost
  // of warm requests. Bounded; validation still runs per request (rules may
  // be per-request).
  const documentCache = new Map<string, DocumentNode>();
  const DOCUMENT_CACHE_LIMIT = 500;

  return async (request: Request): Promise<Response> => {
    const cors = options.cors ?? false;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(cors) });
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
            headers: { "Content-Type": "text/html", ...corsHeaders(cors) },
          });
        }
        return errorResponse("Missing query parameter", 400, cors);
      }
      let variables: Record<string, unknown> | null = null;
      const rawVariables = url.searchParams.get("variables");
      if (rawVariables) {
        try {
          variables = JSON.parse(rawVariables) as Record<string, unknown>;
        } catch {
          return errorResponse("Invalid variables JSON", 400, cors);
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
        return errorResponse("Invalid JSON body", 400, cors);
      }
    } else {
      return errorResponse("Method not allowed", 405, cors);
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
        return json(
          { errors: [formatOne({ message: "PersistedQueryNotFound" })] },
          200,
          cors,
        );
      }
    }
    if (!queryText) {
      return errorResponse("Missing query", 400, cors);
    }
    if (!persisted && !allowArbitrary && options.persistedQueries) {
      return errorResponse("Only persisted queries are accepted", 400, cors);
    }
    if (queryText.length > maxQueryLength) {
      return errorResponse(
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
      return json(
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
    const validationErrors = validate(schema, document, rules);
    if (validationErrors.length > 0) {
      return json(
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
          formatOne(
            e instanceof GraphQLError
              ? e.toJSON()
              : (e as GraphQLFormattedError),
          ),
        );
        report(errors);
        return json(
          errors.length > 0
            ? { data: merged.data, errors }
            : { data: merged.data },
          200,
          cors,
        );
      }
      report([]);
      return multipartResponse(
        result,
        options.incrementalFormat ?? "graphql17",
        cors,
      );
    }

    const errors = (result.errors ?? []).map((e) => formatOne(e.toJSON()));
    report(errors);
    return json(errors.length > 0 ? { ...result, errors } : result, 200, cors);
  };

  function multipartResponse(
    results: IncrementalResults,
    format: "graphql17" | "relay-legacy",
    cors: boolean,
  ): Response {
    const boundary = "graphql";
    const encoder = new TextEncoder();
    const part = (payload: unknown): Uint8Array =>
      encoder.encode(
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}`,
      );

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (format === "relay-legacy") {
            for await (const payload of relayFormatAdapter(results)) {
              controller.enqueue(part(payload));
            }
          } else {
            controller.enqueue(part(results.initialResult));
            for await (const payload of results.subsequentResults) {
              controller.enqueue(part(payload));
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
        ...corsHeaders(cors),
      },
    });
  }
};
