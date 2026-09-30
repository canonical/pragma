import { afterEach, describe, expect, it, vi } from "vitest";
import { createExampleProvider } from "../provider/index.js";
import { createExampleHandler } from "./createExampleHandler.js";

const provider = createExampleProvider();

const post = (body: unknown, init: RequestInit = {}): Request =>
  new Request("http://localhost/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...init,
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST", () => {
  it("executes an operation and returns its data", async () => {
    const handler = createExampleHandler(provider);
    const response = await handler(
      post({ query: "{ ontologies { prefix } }" }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        ontologies: [
          { prefix: "metro" },
          { prefix: "geo" },
          { prefix: "rdfs" },
        ],
      },
    });
  });

  it("passes variables and an operation name through", async () => {
    const handler = createExampleHandler(provider);
    const response = await handler(
      post({
        query: `query A($uri: String!) { ontologyClass(uri: $uri) { uri } }
                query B { ontologies { prefix } }`,
        variables: { uri: "metro:Station" },
        operationName: "A",
      }),
    );
    await expect(response.json()).resolves.toEqual({
      data: { ontologyClass: { uri: "https://metro.example/onto#Station" } },
    });
  });

  it("returns GraphQL errors in the body, not as an HTTP failure", async () => {
    const handler = createExampleHandler(provider);
    const response = await handler(post({ query: "{ nope }" }));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { errors: unknown[] };
    expect(body.errors).toHaveLength(1);
  });

  it("rejects a body that is not JSON", async () => {
    const handler = createExampleHandler(provider);
    const response = await handler(post("not json at all"));
    expect(response.status).toBe(400);
  });

  it("rejects a JSON body with no query string", async () => {
    const handler = createExampleHandler(provider);
    const response = await handler(post({ variables: {} }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errors: [{ message: "Expected a JSON body with a `query` string." }],
    });
  });

  it("rejects a JSON body whose query is not a string", async () => {
    const handler = createExampleHandler(provider);
    expect((await handler(post({ query: 42 }))).status).toBe(400);
  });
});

describe("GET", () => {
  it("serves GraphiQL when enabled", async () => {
    const handler = createExampleHandler(provider, { graphiql: true });
    const response = await handler(new Request("http://localhost/graphql"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/html; charset=utf-8",
    );
    await expect(response.text()).resolves.toContain('<div id="graphiql">');
  });

  it("bakes the configured endpoint into the page", async () => {
    const handler = createExampleHandler(provider, {
      graphiql: true,
      endpoint: "http://example.test/api",
    });
    const response = await handler(new Request("http://localhost/graphql"));
    await expect(response.text()).resolves.toContain(
      'url: "http://example.test/api"',
    );
  });

  it("404s when GraphiQL is disabled", async () => {
    const handler = createExampleHandler(provider, { graphiql: false });
    const response = await handler(new Request("http://localhost/graphql"));
    expect(response.status).toBe(404);
  });
});

describe("CORS", () => {
  it("answers a preflight with 204 and the allow headers", async () => {
    const handler = createExampleHandler(provider, { cors: true });
    const response = await handler(
      new Request("http://localhost/graphql", { method: "OPTIONS" }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS",
    );
  });

  it("sends no allow headers when disabled", async () => {
    const handler = createExampleHandler(provider, { cors: false });
    const response = await handler(
      new Request("http://localhost/graphql", { method: "OPTIONS" }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("sends the headers on a real response too", async () => {
    const handler = createExampleHandler(provider, { cors: true });
    const response = await handler(
      post({ query: "{ ontologies { prefix } }" }),
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("other methods", () => {
  it("405s", async () => {
    const handler = createExampleHandler(provider);
    const response = await handler(
      new Request("http://localhost/graphql", { method: "DELETE" }),
    );
    expect(response.status).toBe(405);
  });
});

describe("the production posture", () => {
  it("serves neither GraphiQL nor CORS when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const handler = createExampleHandler(provider);
    const page = await handler(new Request("http://localhost/graphql"));
    expect(page.status).toBe(404);
    const preflight = await handler(
      new Request("http://localhost/graphql", { method: "OPTIONS" }),
    );
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("serves both outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const handler = createExampleHandler(provider);
    const page = await handler(new Request("http://localhost/graphql"));
    expect(page.status).toBe(200);
    const preflight = await handler(
      new Request("http://localhost/graphql", { method: "OPTIONS" }),
    );
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("still executes operations in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const handler = createExampleHandler(provider);
    const response = await handler(
      post({ query: "{ ontologies { prefix } }" }),
    );
    expect(response.status).toBe(200);
  });
});
