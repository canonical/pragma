// @vitest-environment node

/**
 * Wire-format regression tests for the client HTTP network.
 *
 * These drive the REAL fetch pipeline (createRelayRuntimeNetwork +
 * urlMiddleware + persistedQueryMiddleware + httpExecutor) against a stubbed
 * `globalThis.fetch`, pinning the one thing every mocked-fetchFn suite in
 * this app cannot see: the actual HTTP request that leaves the browser.
 *
 * History: the pipeline's request envelope starts `body: null`, and the
 * original wiring passed only `urlMiddleware` — so every client-side query
 * POSTed an empty body and the server answered 400 "Missing query" while
 * SSR (in-process fetchFn, no HTTP) worked. Found by manual testing, not by
 * any suite.
 *
 * Test 1 is the guard: it inspects the outgoing `RequestInit` directly, so
 * dropping the body-writing middleware fails it hard. Test 2 is NOT a
 * second guard — it asserts the caller receives the parsed payload, and a
 * body-less POST against a stubbed fetch still resolves to the stub's
 * canned response, so it stays green with the middleware removed. It pins
 * response plumbing, not the request envelope.
 */

import { fetchQuery } from "relay-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { componentProbeVariables } from "#domains/playground/probeQuery.js";
import componentProbeQueryNode from "#relay/__generated__/ComponentProbeQuery.graphql.js";
import { createEnvironment } from "./environment.js";
import { DEFAULT_GRAPHQL_URL } from "./graphqlEndpoint.js";

const jsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });

describe("the client HTTP network's wire format", () => {
  const originalFetch = globalThis.fetch;
  /**
   * Set (or clear) the endpoint override on BOTH sources the resolver reads.
   * `vi.stubEnv` writes `process.env` and `import.meta.env` together and
   * `vi.unstubAllEnvs` restores them — see graphqlEndpoint.tests.ts, which
   * pins the same variable and explains the empty-string case.
   */
  const setConfiguredUrl = (value: string | undefined): void => {
    vi.stubEnv("VITE_GRAPHQL_URL", value);
  };

  // The default-endpoint test below asserts against DEFAULT_GRAPHQL_URL, and
  // `createEnvironment()` resolves the ambient `VITE_GRAPHQL_URL` when one is
  // set — which is exactly the workflow the process split introduced, so a
  // developer who exports it would otherwise fail their own `bun run test`.
  // Mirrors graphqlEndpoint.tests.ts, which pins the same variable.
  beforeEach(() => {
    setConfiguredUrl(undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("POSTs a JSON body carrying query text, operation name, and variables", async () => {
    const fetchSpy = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ data: { component: null } }));
    globalThis.fetch = fetchSpy;

    const environment = createEnvironment({ graphqlUrl: "/graphql" });
    await fetchQuery(
      environment,
      componentProbeQueryNode,
      componentProbeVariables(),
    ).toPromise();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls.at(0) as [string, RequestInit];
    expect(url).toBe("/graphql");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );

    // The envelope starts body-less; an empty POST is the historical bug.
    expect(init.body).toBeTruthy();
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.operationName).toBe("ComponentProbeQuery");
    expect(body.variables).toEqual(componentProbeVariables());
    expect(typeof body.query).toBe("string");
    expect(body.query).toContain("query ComponentProbeQuery");
  });

  it("POSTs to the resolved default endpoint when no URL is given", async () => {
    // `graphqlUrl` stays OPTIONAL (≈15 harnesses under src/domains construct
    // an environment without one), so the factory has to reach the same
    // answer `resolveGraphqlUrl` would — an ABSOLUTE URL now, not the
    // same-origin `/graphql` that predates the process split.
    const fetchSpy = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ data: { component: null } }));
    globalThis.fetch = fetchSpy;

    const environment = createEnvironment();
    await fetchQuery(
      environment,
      componentProbeQueryNode,
      componentProbeVariables(),
    ).toPromise();

    const [url] = fetchSpy.mock.calls.at(0) as [string, RequestInit];
    expect(url).toBe(DEFAULT_GRAPHQL_URL);
  });

  it("stamps `headers` onto the outgoing request without losing the content type", async () => {
    // This is how the SSR prepare step marks itself: the graph server reads
    // `x-pragma-ssr` to tell a server render from a browser, and the e2e
    // suite's hit-counting assertions rest entirely on that header arriving.
    const fetchSpy = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ data: { component: null } }));
    globalThis.fetch = fetchSpy;

    const environment = createEnvironment({
      graphqlUrl: "/graphql",
      headers: { "x-pragma-ssr": "1" },
    });
    await fetchQuery(
      environment,
      componentProbeQueryNode,
      componentProbeVariables(),
    ).toPromise();

    const [, init] = fetchSpy.mock.calls.at(0) as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("x-pragma-ssr")).toBe("1");
    // The default "set" merge strategy overwrites only the named key, so the
    // request shaper's own content type survives.
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("delivers the parsed GraphQL payload back to the caller", async () => {
    globalThis.fetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ data: { component: null } }));

    const environment = createEnvironment({ graphqlUrl: "/graphql" });
    const data = await fetchQuery(
      environment,
      componentProbeQueryNode,
      componentProbeVariables(),
    ).toPromise();

    expect(data).toEqual({ component: null });
  });
});
