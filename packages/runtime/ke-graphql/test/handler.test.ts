// =============================================================================
// HTTP handler tests (KG.12/KG.19/KG.21): request parsing, GraphiQL,
// hardening seams, persisted queries, multipart incremental + fallback.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import type { ValidationRule } from "graphql";
import { GraphQLError } from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import { createGraphQLHandler } from "../src/http/index.js";
import { type CompilerResult, compile } from "../src/index.js";
import { storeQueryFn } from "../src/lib/compiler/index.js";
import { DS_REALISTIC_TTL, MINIMAL_TTL, PREFIXES } from "./fixtures.js";

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
  const result = await compile(storeQueryFn(store), PREFIXES, compileOptions);
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
});

describe("hardening seams (KG.19)", () => {
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

describe("incremental delivery over HTTP (KG.21)", () => {
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
});
