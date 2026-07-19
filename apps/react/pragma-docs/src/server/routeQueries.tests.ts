// @vitest-environment node

/**
 * The URL→variables contract of the server prepare step (P-2's collector,
 * exercised at the URLs the P-5 lenses actually serve): `matchRouteQuery`
 * must hand the executor exactly the variables the route's builder derives
 * from the matched URL — percent-decoding included — and stay silent for
 * URLs that map to no query.
 */

import { describe, expect, it } from "vitest";
import { RELATION_PAGE_SIZE } from "#domains/components/entityQuery.js";
import {
  RELATION_PAGE_SIZE as PROBE_RELATION_PAGE_SIZE,
  PROBE_URI,
} from "#domains/playground/probeQuery.js";
import { resolveChipHref } from "#lib/Chip/index.js";
import { appRoutes } from "../routes.js";
import { matchRouteQuery } from "./routeQueries.js";

describe("matchRouteQuery", () => {
  it("resolves /playground to the probe's exact variables", () => {
    const resolved = matchRouteQuery("/playground");
    expect(resolved?.variables).toEqual({
      uri: PROBE_URI,
      count: PROBE_RELATION_PAGE_SIZE,
    });
  });

  it("resolves the entity URL with its percent-decoded uri param", () => {
    const resolved = matchRouteQuery(
      "/components/ds%3Aglobal.component.button",
    );
    expect(resolved?.variables).toEqual({
      uri: "ds:global.component.button",
      count: RELATION_PAGE_SIZE,
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

describe("the entity route's address space", () => {
  it("round-trips render() against resolveChipHref (the D31 landing pin)", () => {
    // A chip click and the router must speak the SAME address for the same
    // noun — byte-identical, encoding included. If either side changes its
    // encoding, this pin snaps.
    expect(
      appRoutes.componentEntity.render({ uri: "ds:global.component.button" }),
    ).toBe(resolveChipHref("ds:global.component.button", "component"));
  });
});
