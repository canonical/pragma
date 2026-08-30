import { route } from "@canonical/router-core";
import { describe, expect, it } from "vitest";
import { appRoutes } from "../../routes.js";
import { collectShortcuts } from "./collectShortcuts.js";
import {
  ROUTE_SHORTCUT_META_KEY,
  routeShortcutFacet,
} from "./shortcutFacet.js";

const page = () => null;

describe("collectShortcuts", () => {
  it("builds both lookups over the routes that claim a key", () => {
    const routes = {
      home: route({
        url: "/",
        component: page,
        meta: routeShortcutFacet.of("1"),
      }),
      quiet: route({ url: "/quiet", component: page }),
      docs: route({
        url: "/docs",
        component: page,
        meta: routeShortcutFacet.of("2"),
      }),
    } as const;
    const { byKey, byRoute } = collectShortcuts(routes);
    expect(Object.fromEntries(byKey)).toEqual({ "1": "home", "2": "docs" });
    expect(Object.fromEntries(byRoute)).toEqual({ home: "1", docs: "2" });
  });

  it("returns empty maps when no route claims a key", () => {
    const routes = {
      quiet: route({ url: "/quiet", component: page }),
    } as const;
    const { byKey, byRoute } = collectShortcuts(routes);
    expect(byKey.size).toBe(0);
    expect(byRoute.size).toBe(0);
  });

  it("throws when two routes claim the same key — the defect this closes", () => {
    // A union type rejected an INVALID key and accepted a DUPLICATE one:
    // this compiled, `.find()` resolved it first-wins, and the rail rendered
    // the digit twice. Now it is a failure, and it names both claimants.
    const routes = {
      definitions: route({
        url: "/definitions",
        component: page,
        meta: routeShortcutFacet.of("3"),
      }),
      dictionary: route({
        url: "/dictionary",
        component: page,
        meta: routeShortcutFacet.of("3"),
      }),
    } as const;
    expect(() => collectShortcuts(routes)).toThrow(/claimed by both/);
    expect(() => collectShortcuts(routes)).toThrow(/definitions/);
    expect(() => collectShortcuts(routes)).toThrow(/dictionary/);
  });

  it("throws when a parameterised route claims a key", () => {
    // `navigate(name)` cannot supply the params a keystroke does not have.
    const routes = {
      term: route({
        url: "/definitions/:term",
        component: page,
        meta: routeShortcutFacet.of("3"),
      }),
    } as const;
    expect(() => collectShortcuts(routes)).toThrow(
      /cannot carry a bare shortcut/,
    );
  });

  it("throws on a malformed claim — not a single character", () => {
    const numeric = {
      home: route({
        url: "/",
        component: page,
        meta: { [ROUTE_SHORTCUT_META_KEY]: 3 },
      }),
    } as const;
    const multiple = {
      home: route({
        url: "/",
        component: page,
        meta: { [ROUTE_SHORTCUT_META_KEY]: "ab" },
      }),
    } as const;
    expect(() => collectShortcuts(numeric)).toThrow(
      /not a single-character key/,
    );
    expect(() => collectShortcuts(multiple)).toThrow(
      /not a single-character key/,
    );
  });

  it("pins the app's real allocation", () => {
    // The integration test: this is the one that fails the day two routes
    // collide, against the table the app actually runs. It is also the
    // reason the throws above are safe in production — the allocation is
    // static route data, and it cannot ship wrong without failing here.
    expect(Object.fromEntries(collectShortcuts(appRoutes).byKey)).toEqual({
      "1": "home",
      "2": "components",
      "3": "definitions",
      "4": "standards",
      "5": "journeys",
      "6": "guides",
    });
  });
});
