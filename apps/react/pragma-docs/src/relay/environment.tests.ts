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
import { afterEach, describe, expect, it, vi } from "vitest";
import { componentProbeVariables } from "#domains/playground/probeQuery.js";
import componentProbeQueryNode from "#relay/__generated__/ComponentProbeQuery.graphql.js";
import { createEnvironment } from "./environment.js";

const jsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });

describe("the client HTTP network's wire format", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
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
