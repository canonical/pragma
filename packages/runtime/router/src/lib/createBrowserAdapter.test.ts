import { describe, expect, it } from "vitest";
import createBrowserAdapter from "./createBrowserAdapter.js";

describe("createBrowserAdapter (auto-detecting)", () => {
  it("returns a History API adapter when Navigation API is unavailable", () => {
    const originalWindow = (globalThis as { window?: unknown }).window;

    (globalThis as { window?: unknown }).window = {
      history: {
        pushState() {},
        replaceState() {},
      },
      location: { href: "https://example.com/" },
      addEventListener() {},
      removeEventListener() {},
    };

    try {
      const adapter = createBrowserAdapter();

      expect(adapter.getLocation()).toMatchObject({ pathname: "/" });
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = originalWindow;
      }
    }
  });

  it("returns a Navigation API adapter when Navigation API is available", () => {
    const originalWindow = (globalThis as { window?: unknown }).window;

    (globalThis as { window?: unknown }).window = {
      navigation: {
        currentEntry: { url: "https://example.com/nav" },
        navigate() {},
        addEventListener() {},
        removeEventListener() {},
      },
      location: { href: "https://example.com/nav" },
    };

    try {
      const adapter = createBrowserAdapter();

      expect(adapter.getLocation()).toMatchObject({ pathname: "/nav" });
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = originalWindow;
      }
    }
  });
});
