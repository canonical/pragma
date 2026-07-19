// @vitest-environment node

/**
 * The URL→variables contract of the server prepare step (P-2's collector,
 * exercised at the URLs the P-5 lenses actually serve): `matchRouteQuery`
 * must hand the executor exactly the variables the route's builder derives
 * from the matched URL — percent-decoding included — and stay silent for
 * URLs that map to no query.
 */

import { describe, expect, it } from "vitest";
import {
  RELATION_PAGE_SIZE as PROBE_RELATION_PAGE_SIZE,
  PROBE_URI,
} from "#domains/playground/probeQuery.js";
import { matchRouteQuery } from "./routeQueries.js";

describe("matchRouteQuery", () => {
  it("resolves /playground to the probe's exact variables", () => {
    const resolved = matchRouteQuery("/playground");
    expect(resolved?.variables).toEqual({
      uri: PROBE_URI,
      count: PROBE_RELATION_PAGE_SIZE,
    });
  });

  it("returns undefined for unmatched URLs", () => {
    expect(matchRouteQuery("/no-such-route")).toBeUndefined();
  });

  it("returns undefined for matched routes that declare no query", () => {
    // The marketing home mounts no ssrQuery entry.
    expect(matchRouteQuery("/")).toBeUndefined();
  });
});
