import { afterEach, beforeEach, describe, expect, it } from "vitest";
import createHashRouter from "./createHashRouter.js";
import route from "./route.js";

function createFakeHashWindow(initialHash = "#/") {
  let hashChangeListener: (() => void) | null = null;

  return {
    location: {
      hash: initialHash,
      href: `https://example.com/${initialHash}`,
    },
    addEventListener(_type: "hashchange", listener: () => void) {
      hashChangeListener = listener;
    },
    removeEventListener(_type: "hashchange", listener: () => void) {
      if (hashChangeListener === listener) {
        hashChangeListener = null;
      }
    },
  };
}

describe("createHashRouter", () => {
  let originalWindow: unknown;

  beforeEach(() => {
    originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = createFakeHashWindow("#/");
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  it("creates a router backed by a hash adapter", () => {
    const routes = {
      home: route({ url: "/", content: () => null }),
    } as const;

    const router = createHashRouter(routes);

    expect(router.routes).toBe(routes);
    expect(router.adapter).toBeDefined();
    expect(router.getState()).toBeDefined();

    router.dispose();
  });

  it("matches routes from the hash", () => {
    const routes = {
      home: route({ url: "/", content: () => null }),
      about: route({ url: "/about", content: () => null }),
    } as const;

    const router = createHashRouter(routes);
    const match = router.match("/about");

    expect(match).toMatchObject({ kind: "route", name: "about" });

    router.dispose();
  });
});
