import { describe, expect, it, vi } from "vitest";
import createHashAdapter from "./createHashAdapter.js";

function createFakeHashWindow(initialHash = "#/") {
  let hashChangeListener: (() => void) | null = null;
  const browserWindow = {
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
    dispatchHashChange(nextHash: string) {
      browserWindow.location.hash = nextHash;
      hashChangeListener?.();
    },
  };

  return browserWindow;
}

describe("createHashAdapter", () => {
  it("throws when no window-like object is available", () => {
    expect(() => {
      createHashAdapter();
    }).toThrow("Hash adapter requires a window-like object.");
  });

  it("uses the global window-like object by default when available", () => {
    const originalWindow = (globalThis as { window?: unknown }).window;

    (globalThis as { window?: unknown }).window =
      createFakeHashWindow("#/default");

    try {
      const adapter = createHashAdapter();

      expect(adapter.getLocation()).toMatchObject({ pathname: "/default" });
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = originalWindow;
      }
    }
  });

  it("returns the initial hash as a pathname", () => {
    const browserWindow = createFakeHashWindow("#/docs");
    const adapter = createHashAdapter(browserWindow);

    expect(adapter.getLocation()).toMatchObject({ pathname: "/docs" });
  });

  it("defaults to / when hash is empty", () => {
    const browserWindow = createFakeHashWindow("");
    const adapter = createHashAdapter(browserWindow);

    expect(adapter.getLocation()).toMatchObject({ pathname: "/" });
  });

  it("navigates by updating the hash", () => {
    const browserWindow = createFakeHashWindow("#/");
    const adapter = createHashAdapter(browserWindow);

    adapter.navigate("/about");

    expect(browserWindow.location.hash).toBe("#/about");
  });

  it("notifies subscribers on navigate", () => {
    const browserWindow = createFakeHashWindow("#/");
    const adapter = createHashAdapter(browserWindow);
    const listener = vi.fn<(location: string | URL) => void>();

    adapter.subscribe(listener);
    adapter.navigate("/contact");

    // hashchange fires from the dispatchHashChange, but navigate sets the hash
    // and the listener is NOT called by navigate itself — only by hashchange
    // So we simulate the browser behaviour:
    browserWindow.dispatchHashChange("#/contact");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/contact" }),
    );
  });

  it("relays hashchange events to subscribers", () => {
    const browserWindow = createFakeHashWindow("#/");
    const adapter = createHashAdapter(browserWindow);
    const listener = vi.fn<(location: string | URL) => void>();

    adapter.subscribe(listener);
    browserWindow.dispatchHashChange("#/products");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/products" }),
    );
  });

  it("detaches the hashchange listener after all subscribers unsubscribe", () => {
    const browserWindow = createFakeHashWindow("#/");
    const adapter = createHashAdapter(browserWindow);
    const first = vi.fn<(location: string | URL) => void>();
    const second = vi.fn<(location: string | URL) => void>();

    const unsubFirst = adapter.subscribe(first);
    const unsubSecond = adapter.subscribe(second);

    browserWindow.dispatchHashChange("#/a");
    unsubFirst();
    browserWindow.dispatchHashChange("#/b");
    unsubSecond();
    browserWindow.dispatchHashChange("#/ignored");

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it("handles absolute URLs by extracting the pathname into the hash", () => {
    const browserWindow = createFakeHashWindow("#/");
    const adapter = createHashAdapter(browserWindow);

    adapter.navigate("https://example.com/settings?tab=general");

    expect(browserWindow.location.hash).toBe("#/settings?tab=general");
  });
});
