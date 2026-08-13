import { route } from "@canonical/router-core";
import { describe, expect, it } from "vitest";
import { collectFacet } from "./collectFacet.js";
import { defineFacet } from "./defineFacet.js";

const badgeFacet = defineFacet<string, "badge">("badge", (value, key) => {
  if (typeof value !== "string") {
    throw new Error(`route meta ${key} is not a string`);
  }
  return value;
});

const page = () => null;

describe("collectFacet", () => {
  it("returns only the bearers, in the table's own key order", () => {
    const routes = {
      first: route({
        url: "/first",
        component: page,
        meta: badgeFacet.of("a"),
      }),
      plain: route({ url: "/plain", component: page }),
      third: route({
        url: "/third",
        component: page,
        meta: badgeFacet.of("c"),
      }),
    } as const;
    expect(
      collectFacet(badgeFacet, routes).map(({ name, value }) => [name, value]),
    ).toEqual([
      ["first", "a"],
      ["third", "c"],
    ]);
  });

  it("hands back the route itself, not just its value", () => {
    const routes = {
      only: route({ url: "/only", component: page, meta: badgeFacet.of("a") }),
    } as const;
    const [bearer] = collectFacet(badgeFacet, routes);
    expect(bearer?.route).toBe(routes.only);
  });

  it("ignores routes carrying a different facet", () => {
    const otherFacet = defineFacet<string, "other">("other", (value) =>
      String(value),
    );
    const routes = {
      other: route({
        url: "/other",
        component: page,
        meta: otherFacet.of("a"),
      }),
    } as const;
    expect(collectFacet(badgeFacet, routes)).toEqual([]);
  });

  it("returns [] for an empty table", () => {
    expect(collectFacet(badgeFacet, {})).toEqual([]);
  });

  it("fails the WHOLE collection on one malformed bearer", () => {
    // Same conviction as `collectRouteQueries`: a bad annotation is a bug to
    // surface, never a route that quietly drops out of the set.
    const routes = {
      good: route({ url: "/good", component: page, meta: badgeFacet.of("a") }),
      bad: route({ url: "/bad", component: page, meta: { badge: 7 } }),
    } as const;
    expect(() => collectFacet(badgeFacet, routes)).toThrow(
      "route meta badge is not a string",
    );
  });
});
