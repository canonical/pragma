import { describe, expect, it, vi } from "vitest";
import createBrowserAdapter from "./createBrowserAdapter.js";

function createFakeBrowserWindow(initialHref = "https://example.com/") {
  let popstateListener: (() => void) | null = null;
  const browserWindow = {
    history: {
      pushState(_state: unknown, _unused: string, url?: string | URL | null) {
        browserWindow.location.href = new URL(
          String(url ?? browserWindow.location.href),
          browserWindow.location.href,
        ).href;
      },
      replaceState(
        _state: unknown,
        _unused: string,
        url?: string | URL | null,
      ) {
        browserWindow.location.href = new URL(
          String(url ?? browserWindow.location.href),
          browserWindow.location.href,
        ).href;
      },
    },
    location: {
      href: initialHref,
    },
    addEventListener(_type: "popstate", listener: () => void) {
      popstateListener = listener;
    },
    removeEventListener(_type: "popstate", listener: () => void) {
      if (popstateListener === listener) {
        popstateListener = null;
      }
    },
    dispatchPopState(nextHref: string) {
      browserWindow.location.href = nextHref;
      popstateListener?.();
    },
  };

  return browserWindow;
}

describe("createBrowserAdapter", () => {
  it("throws when no window-like object is available", () => {
    expect(() => {
      createBrowserAdapter();
    }).toThrow("Browser adapter requires a window-like object.");
  });

  it("uses the global window-like object by default when available", () => {
    const originalWindow = (globalThis as { window?: unknown }).window;

    (globalThis as { window?: unknown }).window = createFakeBrowserWindow(
      "https://example.com/default",
    );

    try {
      const adapter = createBrowserAdapter();

      expect(adapter.getLocation()).toMatchObject({ pathname: "/default" });
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = originalWindow;
      }
    }
  });

  it("publishes push and replace navigations to subscribers", () => {
    const browserWindow = createFakeBrowserWindow();
    const adapter = createBrowserAdapter(browserWindow);
    const listener = vi.fn<(location: string | URL) => void>();

    adapter.subscribe(listener);
    adapter.navigate("/docs");
    adapter.navigate("/docs?page=2", { replace: true, state: { page: 2 } });

    expect(adapter.getLocation()).toMatchObject({
      pathname: "/docs",
      search: "?page=2",
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("relays popstate updates and detaches listeners after unsubscribe", () => {
    const browserWindow = createFakeBrowserWindow("https://example.com/start");
    const adapter = createBrowserAdapter(browserWindow);
    const firstListener = vi.fn<(location: string | URL) => void>();
    const secondListener = vi.fn<(location: string | URL) => void>();

    const unsubscribeFirst = adapter.subscribe(firstListener);
    const unsubscribeSecond = adapter.subscribe(secondListener);

    browserWindow.dispatchPopState("https://example.com/back");
    unsubscribeFirst();
    browserWindow.dispatchPopState("https://example.com/next");
    unsubscribeSecond();
    browserWindow.dispatchPopState("https://example.com/ignored");

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(2);
    expect(firstListener).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/back" }),
    );
    expect(secondListener).toHaveBeenLastCalledWith(
      expect.objectContaining({ pathname: "/next" }),
    );
  });
});
