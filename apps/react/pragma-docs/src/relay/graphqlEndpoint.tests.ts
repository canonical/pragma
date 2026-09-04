// @vitest-environment node

/**
 * The endpoint resolver's precedence contract.
 *
 * Three cases, and the middle one is the subtle one: an empty
 * `VITE_GRAPHQL_URL` (a bare `VITE_GRAPHQL_URL=` line in a `.env` file, or an
 * exported-but-blank shell variable) must read as UNSET rather than as the
 * empty URL. That behaviour predates the process split — it lived in
 * `environment.ts`'s `readConfiguredGraphqlUrl` — and moving the resolver
 * must not lose it, because an empty URL would make every operation POST to
 * the page's own address and come back as HTML.
 *
 * The node environment is deliberate: this suite drives the `process.env`
 * source. Vitest keeps `import.meta.env` in step with `process.env`, so
 * whichever arm answers, it answers with the same value — which is the
 * property the resolver is claiming in the first place.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GRAPHQL_URL,
  GRAPHQL_URL_ENV_VAR,
  resolveGraphqlUrl,
} from "./graphqlEndpoint.js";

/**
 * Set (or clear) the env var on BOTH sources the resolver reads.
 *
 * `vi.stubEnv` writes `process.env` and `import.meta.env` together, which is
 * exactly the pair this resolver spans, and `vi.unstubAllEnvs` restores the
 * ambient value — so no test can leak an endpoint into the next one.
 *
 * It also preserves the empty-string case, which is the subtle one this suite
 * exists to pin: `stubEnv(name, "")` stores `""` on both sides rather than
 * deleting the key, so "empty reads as unset" stays a claim about the
 * RESOLVER and cannot pass vacuously because the harness unset it.
 */
const setConfiguredUrl = (value: string | undefined): void => {
  vi.stubEnv(GRAPHQL_URL_ENV_VAR, value);
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveGraphqlUrl", () => {
  it("prefers the configured endpoint over the default", () => {
    setConfiguredUrl("http://graph.example:9999/graphql");
    expect(resolveGraphqlUrl()).toBe("http://graph.example:9999/graphql");
  });

  it("treats an empty configured value as unset", () => {
    setConfiguredUrl("");
    expect(resolveGraphqlUrl()).toBe(DEFAULT_GRAPHQL_URL);
  });

  it("falls back to the default when nothing is configured", () => {
    setConfiguredUrl(undefined);
    expect(resolveGraphqlUrl()).toBe(DEFAULT_GRAPHQL_URL);
  });

  it("names the env var with the browser-visible VITE_ prefix", () => {
    // Only `VITE_*` reaches the client bundle; the prefix is load-bearing.
    expect(GRAPHQL_URL_ENV_VAR).toBe("VITE_GRAPHQL_URL");
    expect(GRAPHQL_URL_ENV_VAR.startsWith("VITE_")).toBe(true);
  });

  it("carries the port exactly once, in the default URL", () => {
    // `graph.ts` / `withGraph.ts` derive the port from this URL rather than
    // restating the number, so the parse must succeed.
    expect(new URL(DEFAULT_GRAPHQL_URL).port).toBe("5175");
    expect(new URL(DEFAULT_GRAPHQL_URL).pathname).toBe("/graphql");
  });
});
