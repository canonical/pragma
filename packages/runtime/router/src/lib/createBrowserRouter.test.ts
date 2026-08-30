import { afterEach, beforeEach, describe, expect, it } from "vitest";
import createBrowserRouter from "./createBrowserRouter.js";
import route from "./route.js";

describe("createBrowserRouter", () => {
  let originalWindow: unknown;

  beforeEach(() => {
    originalWindow = (globalThis as { window?: unknown }).window;

    (globalThis as { window?: unknown }).window = {
      history: {
        pushState() {},
        replaceState() {},
      },
      location: { href: "https://example.com/" },
      addEventListener() {},
      removeEventListener() {},
    };
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  it("creates a router backed by a browser adapter", () => {
    const routes = {
      home: route({ url: "/", content: () => null }),
    } as const;

    const router = createBrowserRouter(routes);

    expect(router.routes).toBe(routes);
    expect(router.adapter).toBeDefined();

    router.dispose();
  });
});
