// =============================================================================
// HTTP handler tests: request parsing, GraphiQL,
// hardening seams, persisted queries, multipart incremental + fallback.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import type {
  GraphQLFieldConfig,
  GraphQLSchema,
  ValidationRule,
} from "graphql";
import {
  GraphQLDeferDirective,
  GraphQLError,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema as GraphQLSchemaClass,
  GraphQLStreamDirective,
  GraphQLString,
  specifiedDirectives,
} from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import { type CompilerResult, compile, createStoreQueryFn } from "#compiler";
import type { CompilerContext } from "#shared";
import { DS_REALISTIC_TTL, MINIMAL_TTL, PREFIXES } from "#testing";
import createGraphQLHandler from "./createGraphQLHandler.js";

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

const setupHandler = async (
  ttl: string,
  compileOptions: Parameters<typeof compile>[2] = {},
  handlerOptions: Partial<Parameters<typeof createGraphQLHandler>[1]> = {},
): Promise<{
  handler: (request: Request) => Promise<Response>;
  result: CompilerResult;
}> => {
  const { store, cleanup } = await createTestStore({ ttl, prefixes: PREFIXES });
  cleanups.push(cleanup);
  const result = await compile(
    createStoreQueryFn(store),
    PREFIXES,
    compileOptions,
  );
  const handler = createGraphQLHandler(result.schema, {
    context: () => result.createContext(store),
    graphiql: true,
    ...handlerOptions,
  });
  return { handler, result };
};

const post = (body: unknown, headers: Record<string, string> = {}): Request =>
  new Request("http://localhost/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

// A minimal @defer-capable schema whose deferred `leaf` field is configured by
// the caller. The store-backed schema cannot deterministically make a deferred
// fragment error or emit a non-serializable payload, so these handler-mechanics
// paths (incremental error formatting, multipart stream failure) use this
// hand-built schema. The resolvers ignore the context.
const buildDeferSchema = (
  leaf: GraphQLFieldConfig<unknown, unknown>,
): GraphQLSchema => {
  const Inner = new GraphQLObjectType({
    name: "Inner",
    fields: {
      ok: { type: GraphQLString, resolve: () => "fine" },
      leaf,
    },
  });
  return new GraphQLSchemaClass({
    query: new GraphQLObjectType({
      name: "Query",
      fields: { root: { type: Inner, resolve: () => ({}) } },
    }),
    directives: [
      ...specifiedDirectives,
      GraphQLDeferDirective,
      GraphQLStreamDirective,
    ],
  });
};

const deferContext = () => ({}) as unknown as CompilerContext;

const DEFER_LEAF_QUERY = `
  query Q {
    root { ok ... D @defer(label: "d") }
  }
  fragment D on Inner { leaf }
`;

describe("request handling", () => {
  it("executes a POST query", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    const response = await handler(
      post({ query: `{ thing(uri: "ex:widget") { name } }` }),
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      data: { thing: { name: string } };
    };
    expect(json.data.thing.name).toBe("Widget");
  });

  it("rejects queries deeper than maxDepth (hardening)", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL, {}, { maxDepth: 1 });
    const response = await handler(
      post({ query: `{ thing(uri: "ex:widget") { name } }` }), // depth 2
    );
    expect(response.status).toBe(400);
    const json = (await response.json()) as { errors: { message: string }[] };
    expect(json.errors[0]?.message).toMatch(/maximum depth/);
  });

  it("filters a SPARQL-injection attempt in a uri argument to null (hardening)", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    const response = await handler(
      post({
        query: `{ thing(uri: "ex:evil> } INSERT { ?s ?p ?o }") { name } }`,
      }),
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      data: { thing: unknown };
      errors?: unknown;
    };
    // The unsafe IRI is dropped from the query and resolves to "not found".
    expect(json.data.thing).toBeNull();
    expect(json.errors).toBeUndefined();
  });

  it("executes a GET query from the URL parameter", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    const url = `http://localhost/graphql?query=${encodeURIComponent(
      `{ things(first: 1) { edges { node { name } } } }`,
    )}`;
    const response = await handler(new Request(url));
    expect(response.status).toBe(200);
  });

  it("serves GraphiQL on GET with Accept: text/html", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    const response = await handler(
      new Request("http://localhost/graphql", {
        headers: { Accept: "text/html" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("GraphiQL");
  });

  it("returns 400 for malformed GET variables JSON", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    const url = `http://localhost/graphql?query=${encodeURIComponent("{ __typename }")}&variables={bad`;
    const response = await handler(new Request(url));
    expect(response.status).toBe(400);
  });

  it("treats Accept q=0 as not acceptable (RFC 9110)", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    const response = await handler(
      new Request("http://localhost/graphql", {
        headers: { Accept: "text/html;q=0" },
      }),
    );
    // GraphiQL must NOT be served; falls through to the missing-query error
    expect(response.status).toBe(400);
  });

  it("rejects invalid JSON, missing queries, and other methods", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    const bad = await handler(
      new Request("http://localhost/graphql", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(bad.status).toBe(400);
    const missing = await handler(post({}));
    expect(missing.status).toBe(400);
    const put = await handler(
      new Request("http://localhost/graphql", { method: "PUT" }),
    );
    expect(put.status).toBe(405);
  });

  it("answers CORS preflight when enabled", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL, {}, { cors: true });
    const response = await handler(
      new Request("http://localhost/graphql", { method: "OPTIONS" }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("returns parse and validation errors with status 400", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    const parseError = await handler(post({ query: "{ nope" }));
    expect(parseError.status).toBe(400);
    const validationError = await handler(post({ query: "{ noSuchField }" }));
    expect(validationError.status).toBe(400);
  });

  it("reuses the parsed-document cache on a repeated query", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    const query = `{ thing(uri: "ex:widget") { name } }`;
    const first = await handler(post({ query }));
    // Second request with identical text hits the document cache.
    const second = await handler(post({ query }));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const a = (await first.json()) as { data: { thing: { name: string } } };
    const b = (await second.json()) as { data: { thing: { name: string } } };
    expect(a.data.thing.name).toBe("Widget");
    expect(b.data.thing.name).toBe("Widget");
  });

  it("clears the document cache once it reaches the size limit", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    // 501 distinct queries parse and cache, but fail validation (unknown
    // field) before execution — fast. The 501st insertion trips the clear.
    let last: Response | undefined;
    for (let i = 0; i <= 500; i++) {
      last = await handler(post({ query: `{ field${i} }` }));
    }
    expect(last?.status).toBe(400);
  });
});

describe("hardening seams", () => {
  it("runs consumer validation rules", async () => {
    const rejectAll: ValidationRule = (context) => ({
      OperationDefinition(node) {
        context.reportError(
          new GraphQLError("rejected by policy", { nodes: node }),
        );
      },
    });
    const { handler } = await setupHandler(
      MINIMAL_TTL,
      {},
      { validationRules: [rejectAll] },
    );
    const response = await handler(post({ query: "{ __typename }" }));
    expect(response.status).toBe(400);
    const json = (await response.json()) as {
      errors: Array<{ message: string }>;
    };
    expect(json.errors[0]?.message).toBe("rejected by policy");
  });

  it("blocks introspection when disabled", async () => {
    const { handler } = await setupHandler(
      MINIMAL_TTL,
      {},
      { introspection: false },
    );
    const response = await handler(
      post({ query: "{ __schema { types { name } } }" }),
    );
    expect(response.status).toBe(400);
  });

  it("enforces maxQueryLength", async () => {
    const { handler } = await setupHandler(
      MINIMAL_TTL,
      {},
      { maxQueryLength: 10 },
    );
    const response = await handler(
      post({ query: "{ things { edges { cursor } } }" }),
    );
    expect(response.status).toBe(413);
  });

  it("disables the depth-limit rule when maxDepth is 0", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL, {}, { maxDepth: 0 });
    // A query deeper than the default limit still succeeds with the rule off.
    const response = await handler(
      post({ query: `{ thing(uri: "ex:widget") { name } }` }),
    );
    expect(response.status).toBe(200);
  });

  it("applies a consumer formatError to every error", async () => {
    const { handler } = await setupHandler(
      MINIMAL_TTL,
      {},
      {
        formatError: (error) => ({
          ...error,
          message: `tagged: ${error.message}`,
        }),
      },
    );
    const response = await handler(post({ query: "{ noSuchField }" }));
    expect(response.status).toBe(400);
    const json = (await response.json()) as {
      errors: Array<{ message: string }>;
    };
    expect(json.errors[0]?.message).toMatch(/^tagged: /);
  });

  it("accepts validationRules supplied as a per-request function", async () => {
    const rejectAll: ValidationRule = (context) => ({
      OperationDefinition(node) {
        context.reportError(
          new GraphQLError("rejected per-request", { nodes: node }),
        );
      },
    });
    const { handler } = await setupHandler(
      MINIMAL_TTL,
      {},
      { validationRules: () => [rejectAll] },
    );
    const response = await handler(post({ query: "{ __typename }" }));
    expect(response.status).toBe(400);
    const json = (await response.json()) as {
      errors: Array<{ message: string }>;
    };
    expect(json.errors[0]?.message).toBe("rejected per-request");
  });

  it("formats errors from a plain (non-incremental) execution", async () => {
    const schema = buildDeferSchema({
      type: GraphQLString,
      resolve: () => {
        throw new Error("resolver blew up");
      },
    });
    const handler = createGraphQLHandler(schema, { context: deferContext });
    // A non-@defer query returns a plain ExecutionResult; its errors take the
    // data+errors branch of the final response.
    const response = await handler(post({ query: `{ root { leaf } }` }));
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      data: { root: { leaf: string | null } };
      errors: Array<{ message: string }>;
    };
    expect(json.errors[0]?.message).toBe("resolver blew up");
    expect(json.data.root.leaf).toBeNull();
  });

  it("serves persisted queries by hash and can reject arbitrary ones", async () => {
    const manifest = new Map([
      ["abc123", `{ thing(uri: "ex:widget") { name } }`],
    ]);
    const { handler } = await setupHandler(
      MINIMAL_TTL,
      {},
      {
        persistedQueries: {
          get: (hash) => manifest.get(hash) ?? null,
          allowArbitraryQueries: false,
        },
      },
    );
    const hit = await handler(
      post({ extensions: { persistedQuery: { sha256Hash: "abc123" } } }),
    );
    expect(hit.status).toBe(200);
    const miss = await handler(
      post({ extensions: { persistedQuery: { sha256Hash: "nope" } } }),
    );
    const missJson = (await miss.json()) as {
      errors: Array<{ message: string }>;
    };
    expect(missJson.errors[0]?.message).toBe("PersistedQueryNotFound");
    const arbitrary = await handler(post({ query: "{ __typename }" }));
    expect(arbitrary.status).toBe(400);
  });

  it("strips field suggestions when hideFieldSuggestions is set", async () => {
    const { handler } = await setupHandler(
      MINIMAL_TTL,
      {},
      { hideFieldSuggestions: true },
    );
    // A close typo ("thin" → "thing"/"things") normally yields a
    // "Did you mean …?" suffix; the suggestion stripper removes it.
    const response = await handler(
      post({ query: `{ thin(uri: "ex:widget") { name } }` }),
    );
    expect(response.status).toBe(400);
    const json = (await response.json()) as {
      errors: Array<{ message: string }>;
    };
    expect(json.errors[0]?.message).toContain("Cannot query field");
    expect(json.errors[0]?.message).not.toContain("Did you mean");
  });

  it("falls back to an inline query when a persisted hash misses", async () => {
    const manifest = new Map<string, string>();
    const { handler } = await setupHandler(
      MINIMAL_TTL,
      {},
      {
        persistedQueries: {
          get: (hash) => manifest.get(hash) ?? null,
          // dev default allows arbitrary queries, so the inline query runs.
        },
      },
    );
    // Hash misses (empty manifest) but the request carries a query too — the
    // automatic-persisted-query register flow falls through and executes it.
    const response = await handler(
      post({
        query: `{ thing(uri: "ex:widget") { name } }`,
        extensions: { persistedQuery: { sha256Hash: "unregistered" } },
      }),
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      data: { thing: { name: string } };
    };
    expect(json.data.thing.name).toBe("Widget");
  });

  it("reports operations through onOperation", async () => {
    const events: Array<{ operation: string | null }> = [];
    const { handler } = await setupHandler(
      MINIMAL_TTL,
      {},
      { onOperation: (event) => events.push(event) },
    );
    await handler(
      post({ query: `query Named { thing(uri: "ex:widget") { name } }` }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.operation).toBe("Named");
  });
});

describe("incremental delivery over HTTP", () => {
  const deferQuery = `
    query Q {
      component(uri: "ds:global.component.button") {
        name
        ... S @defer(label: "rest")
      }
    }
    fragment S on Component { summary }
  `;
  const dsOptions = {
    incremental: true,
    mappings: { "ds:hasProperty": { graphqlName: "properties" } },
  };

  it("streams multipart/mixed when accepted", async () => {
    const { handler } = await setupHandler(DS_REALISTIC_TTL, dsOptions, {
      incremental: true,
    });
    const response = await handler(
      post({ query: deferQuery }, { Accept: "multipart/mixed" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("multipart/mixed");
    const text = await response.text();
    expect(text).toContain('"name":"Button"');
    expect(text).toContain('"summary":"Primary action trigger."');
    expect(text).toContain("--graphql--");
  });

  it("streams relay-legacy payloads when configured", async () => {
    const { handler } = await setupHandler(DS_REALISTIC_TTL, dsOptions, {
      incremental: true,
      incrementalFormat: "relay-legacy",
    });
    const response = await handler(
      post({ query: deferQuery }, { Accept: "multipart/mixed" }),
    );
    const text = await response.text();
    expect(text).toContain('"label":"rest"');
    expect(text).toContain('"is_final":true');
  });

  it("drains and merges for clients without multipart accept", async () => {
    const { handler } = await setupHandler(DS_REALISTIC_TTL, dsOptions, {
      incremental: true,
    });
    const response = await handler(post({ query: deferQuery }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    const json = (await response.json()) as {
      data: { component: { name: string; summary: string } };
    };
    expect(json.data.component.name).toBe("Button");
    expect(json.data.component.summary).toBe("Primary action trigger.");
  });

  it("masks a deferred-fragment error in the drain-and-merge fallback", async () => {
    const schema = buildDeferSchema({
      type: GraphQLString,
      resolve: () => {
        throw new Error("connection refused: db://secret@host");
      },
    });
    const handler = createGraphQLHandler(schema, {
      context: deferContext,
      maskErrors: true,
    });
    // No multipart Accept → the increments are drained and merged, and the
    // deferred error is formatted (masked) into the single JSON response.
    const response = await handler(post({ query: DEFER_LEAF_QUERY }));
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      data: { root: { ok: string; leaf: string | null } };
      errors: Array<{ message: string; extensions?: { code?: string } }>;
    };
    expect(json.data.root.ok).toBe("fine");
    expect(json.errors).toHaveLength(1);
    expect(json.errors[0]?.message).toBe("Internal server error");
    expect(json.errors[0]?.extensions?.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("errors the multipart stream when a deferred payload is not serializable", async () => {
    // A scalar that serializes to a BigInt: graphql emits it into the deferred
    // payload, then JSON.stringify throws inside the stream, which surfaces as
    // a stream error.
    const BigIntScalar = new GraphQLScalarType({
      name: "BigIntScalar",
      serialize: () => 1n,
    });
    const schema = buildDeferSchema({
      type: BigIntScalar,
      resolve: () => "ignored",
    });
    const handler = createGraphQLHandler(schema, {
      context: deferContext,
      incremental: true,
    });
    const response = await handler(
      post({ query: DEFER_LEAF_QUERY }, { Accept: "multipart/mixed" }),
    );
    expect(response.headers.get("content-type")).toContain("multipart/mixed");
    // The initial part enqueues fine; draining the deferred part trips the
    // JSON.stringify failure, erroring the stream.
    await expect(response.text()).rejects.toThrow();
  });

  it("masks a deferred-fragment error on the multipart streaming path", async () => {
    const schema = buildDeferSchema({
      type: GraphQLString,
      resolve: () => {
        throw new Error("connection refused: db://secret@host");
      },
    });
    const handler = createGraphQLHandler(schema, {
      context: deferContext,
      maskErrors: true,
      incremental: true,
    });
    const response = await handler(
      post({ query: DEFER_LEAF_QUERY }, { Accept: "multipart/mixed" }),
    );
    expect(response.headers.get("content-type")).toContain("multipart/mixed");
    const text = await response.text();
    // The masked message streams; the raw store error never reaches the client.
    expect(text).toContain("Internal server error");
    expect(text).not.toContain("connection refused");
  });

  it("masks a deferred-fragment error on the relay-legacy streaming path", async () => {
    const schema = buildDeferSchema({
      type: GraphQLString,
      resolve: () => {
        throw new Error("connection refused: db://secret@host");
      },
    });
    const handler = createGraphQLHandler(schema, {
      context: deferContext,
      maskErrors: true,
      incremental: true,
      incrementalFormat: "relay-legacy",
    });
    const response = await handler(
      post({ query: DEFER_LEAF_QUERY }, { Accept: "multipart/mixed" }),
    );
    const text = await response.text();
    expect(text).toContain("Internal server error");
    expect(text).not.toContain("connection refused");
  });

  it("returns 400 for a literal null JSON body instead of crashing", async () => {
    const { handler } = await setupHandler(MINIMAL_TTL);
    const response = await handler(
      new Request("http://localhost/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "null",
      }),
    );
    expect(response.status).toBe(400);
  });
});
