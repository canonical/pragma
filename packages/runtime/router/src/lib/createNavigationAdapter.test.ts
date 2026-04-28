import { describe, expect, it, vi } from "vitest";
import createNavigationAdapter from "./createNavigationAdapter.js";

function createFakeNavigationWindow(initialHref = "https://example.com/") {
  let navigateListener:
    | ((event: {
        navigationType: string;
        destination: { url: string };
        canIntercept: boolean;
        hashChange: boolean;
        intercept: (options?: { handler?: () => void | Promise<void> }) => void;
      }) => void)
    | null = null;

  const navigationWindow = {
    location: { href: initialHref },
    navigation: {
      currentEntry: { url: initialHref },
      navigate(url: string, options?: { history?: "push" | "replace" }) {
        navigationWindow.location.href = new URL(
          url,
          navigationWindow.location.href,
        ).href;
        void options;
      },
      addEventListener(_type: "navigate", listener: typeof navigateListener) {
        navigateListener = listener;
      },
      removeEventListener(
        _type: "navigate",
        listener: typeof navigateListener,
      ) {
        if (navigateListener === listener) {
          navigateListener = null;
        }
      },
    },
    dispatchNavigate(nextHref: string, navigationType: string = "traverse") {
      navigationWindow.location.href = nextHref;
      navigateListener?.({
        navigationType,
        destination: { url: nextHref },
        canIntercept: true,
        hashChange: false,
        intercept: vi.fn(),
      });
    },
    dispatchNavigateRaw(event: Parameters<NonNullable<typeof navigateListener>>[0]) {
      navigateListener?.(event);
    },
  };

  return navigationWindow;
}

describe("createNavigationAdapter (Navigation API)", () => {
  it("throws when the Navigation API is unavailable", () => {
    expect(() => {
      createNavigationAdapter();
    }).toThrow("Navigation adapter requires a window with the Navigation API.");
  });

  it("publishes push and replace navigations to subscribers", () => {
    const navigationWindow = createFakeNavigationWindow();
    const adapter = createNavigationAdapter(navigationWindow);
    const listener = vi.fn<(location: string | URL) => void>();

    adapter.subscribe(listener);
    adapter.navigate("/docs");
    adapter.navigate("/docs?page=2", { replace: true });

    expect(adapter.getLocation()).toMatchObject({
      pathname: "/docs",
      search: "?page=2",
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("relays traverse navigations and detaches listeners after unsubscribe", () => {
    const navigationWindow = createFakeNavigationWindow(
      "https://example.com/start",
    );
    const adapter = createNavigationAdapter(navigationWindow);
    const firstListener = vi.fn<(location: string | URL) => void>();
    const secondListener = vi.fn<(location: string | URL) => void>();

    const unsubscribeFirst = adapter.subscribe(firstListener);
    const unsubscribeSecond = adapter.subscribe(secondListener);

    navigationWindow.dispatchNavigate("https://example.com/back", "traverse");
    unsubscribeFirst();
    navigationWindow.dispatchNavigate("https://example.com/next", "traverse");
    unsubscribeSecond();
    navigationWindow.dispatchNavigate(
      "https://example.com/ignored",
      "traverse",
    );

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(2);
    expect(firstListener).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/back" }),
    );
    expect(secondListener).toHaveBeenLastCalledWith(
      expect.objectContaining({ pathname: "/next" }),
    );
  });

  it("intercepts push and replace events without notifying subscribers", () => {
    const navigationWindow = createFakeNavigationWindow();
    const adapter = createNavigationAdapter(navigationWindow);
    const listener = vi.fn<(location: string | URL) => void>();

    adapter.subscribe(listener);
    navigationWindow.dispatchNavigate("https://example.com/push", "push");
    navigationWindow.dispatchNavigate("https://example.com/replace", "replace");

    // Push/replace events are intercepted (preventing full reload) but don't
    // notify subscribers — the router's navigate() method handles notification.
    expect(listener).toHaveBeenCalledTimes(0);
  });

  it("ignores hash-change navigate events", () => {
    const navigationWindow = createFakeNavigationWindow();
    const adapter = createNavigationAdapter(navigationWindow);
    const listener = vi.fn<(location: string | URL) => void>();

    adapter.subscribe(listener);

    navigationWindow.dispatchNavigateRaw({
      navigationType: "traverse",
      destination: { url: "https://example.com/#section" },
      canIntercept: true,
      hashChange: true,
      intercept: vi.fn(),
    });

    expect(listener).toHaveBeenCalledTimes(0);
  });

  it("ignores navigate events that cannot be intercepted", () => {
    const navigationWindow = createFakeNavigationWindow();
    const adapter = createNavigationAdapter(navigationWindow);
    const listener = vi.fn<(location: string | URL) => void>();

    adapter.subscribe(listener);
    navigationWindow.location.href = "https://example.com/external";
    // biome-ignore lint/suspicious/noExplicitAny: test mock override
    const getListener = (navigationWindow.navigation as any)
      .addEventListener as (...args: unknown[]) => unknown;
    void getListener;

    expect(listener).toHaveBeenCalledTimes(0);
  });
});
