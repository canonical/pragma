// @vitest-environment node

/**
 * The prepare step's degradation contract: a malformed route `ssrQuery` meta
 * entry must never escape `prepareRelayData`. The collector behind
 * `matchRouteQuery` walks EVERY route's meta for every URL, so one bad entry
 * would otherwise throw for the whole site — every route a 500 — instead of
 * degrading that render to the no-server-data path (logged, client fetches
 * over HTTP as before P-2).
 */

import { describe, expect, it, vi } from "vitest";
import { prepareRelayData } from "./prepareRelayData.js";

// A routes table whose /playground entry is malformed (`variables: 42`, not
// a function — `readRouteQueryEntry` throws on it during collection),
// replacing the real app routes for the matcher and collector alike.
vi.mock("../routes.js", async () => {
  const { route } = await import("@canonical/router-core");
  const { ROUTE_QUERY_META_KEY } = await import("#relay/routeQuery.js");
  return {
    appRoutes: {
      home: route({ url: "/", component: () => null }),
      playground: route({
        url: "/playground",
        component: () => null,
        meta: {
          [ROUTE_QUERY_META_KEY]: {
            query: { params: { text: "query ProbeQuery { __typename }" } },
            variables: 42,
          },
        },
      }),
    },
    middleware: [],
    notFoundRoute: route({ url: "/not-found", component: () => null }),
  };
});

/**
 * A deliberately dead endpoint. Both cases below throw inside
 * `matchRouteQuery` — the collector walks the malformed entry before any
 * transport is constructed — so the URL is never dialled and a bogus one
 * keeps the suite honest: if either case ever DID reach the network, the
 * connection refusal would make that obvious rather than letting a real
 * request slip out of a unit test.
 */
const DEAD_GRAPHQL_URL = "http://127.0.0.1:1/graphql";

/** Runs `prepareRelayData` with the degradation log silenced and captured. */
const prepareSilenced = async (url: string) => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const prepared = await prepareRelayData(url, DEAD_GRAPHQL_URL);
    return { prepared, consoleError: consoleError.mock.calls };
  } finally {
    consoleError.mockRestore();
  }
};

describe("prepareRelayData with a malformed route meta entry present", () => {
  it("resolves with no records (logged) for the malformed route's own URL", async () => {
    const { prepared, consoleError } = await prepareSilenced("/playground");
    expect(prepared).toBeUndefined();
    expect(consoleError).toContainEqual([
      expect.stringContaining("relay prepare failed for /playground"),
      expect.anything(),
    ]);
  });

  it("resolves with no records for every OTHER route too — the collector walks all metas", async () => {
    const { prepared } = await prepareSilenced("/");
    expect(prepared).toBeUndefined();
  });
});
