import { describe, expect, it, vi } from "vitest";
import createNavigationAdapter from "./createNavigationAdapter.js";

interface FakeInterceptOptions {
  handler?: () => void | Promise<void>;
  focusReset?: "after-transition" | "manual";
  scroll?: "after-transition" | "manual";
}

function createFakeNavigationWindow(initialHref = "https://example.com/") {
  let navigateListener:
    | ((event: {
        navigationType: string;
        destination: { url: string };
        canIntercept: boolean;
        hashChange: boolean;
        intercept: (options?: FakeInterceptOptions) => void;
      }) => void)
    | null = null;

  const navigationWindow = {
    location: { href: initialHref },
    // Set to emulate the real Navigation API's `{ committed, finished }`
    // return value; `undefined` emulates environments without it.
    nextNavigateResult: undefined as
      | { committed?: Promise<unknown>; finished?: Promise<unknown> }
      | undefined,
    navigation: {
      currentEntry: { url: initialHref },
      navigate(url: string, options?: { history?: "push" | "replace" }) {
        const destination = new URL(url, navigationWindow.location.href).href;

        // As in the browser, the navigate event fires synchronously inside
        // navigation.navigate(), before the URL changes.
        navigateListener?.({
          navigationType: options?.history ?? "push",
          destination: { url: destination },
          canIntercept: true,
          hashChange: false,
          intercept: (interceptOptions?: FakeInterceptOptions) => {
            navigationWindow.lastInterceptOptions = interceptOptions;
          },
        });
        navigationWindow.location.href = destination;

        return navigationWindow.nextNavigateResult;
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
    lastInterceptOptions: undefined as FakeInterceptOptions | undefined,
    dispatchNavigate(nextHref: string, navigationType: string = "traverse") {
      navigationWindow.location.href = nextHref;
      navigateListener?.({
        navigationType,
        destination: { url: nextHref },
        canIntercept: true,
        hashChange: false,
        intercept: (options?: FakeInterceptOptions) => {
          navigationWindow.lastInterceptOptions = options;
        },
      });
    },
    dispatchNavigateRaw(
      event: Parameters<NonNullable<typeof navigateListener>>[0],
    ) {
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

  it("catches rejections from the navigation transition promises", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    try {
      const navigationWindow = createFakeNavigationWindow();
      const adapter = createNavigationAdapter(navigationWindow);

      // A superseded navigation rejects both transition promises.
      navigationWindow.nextNavigateResult = {
        committed: Promise.reject(new Error("aborted")),
        finished: Promise.reject(new Error("superseded")),
      };
      adapter.navigate("/docs");

      // Partial results (either promise absent) must also be tolerated.
      navigationWindow.nextNavigateResult = {
        committed: Promise.resolve(null),
      };
      adapter.navigate("/docs?page=2");

      navigationWindow.nextNavigateResult = {
        finished: Promise.reject(new Error("superseded")),
      };
      adapter.navigate("/guides", { replace: true });

      // Drain microtasks twice so any unhandled rejection gets reported.
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));

      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("hands the tracked router load to the intercept handler", async () => {
    const navigationWindow = createFakeNavigationWindow();
    const adapter = createNavigationAdapter(navigationWindow);

    adapter.subscribe(() => {});

    let releaseLoad!: () => void;
    const load = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });

    adapter.trackLoad?.(load);
    navigationWindow.dispatchNavigate("https://example.com/docs", "push");

    const handler = navigationWindow.lastInterceptOptions?.handler;

    expect(handler).toBeTypeOf("function");

    let settled = false;
    const handled = Promise.resolve(handler?.()).then(() => {
      settled = true;
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(settled).toBe(false);

    releaseLoad();
    await handled;
    expect(settled).toBe(true);
  });

  it("resolves the intercept handler even when the tracked load rejects", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    try {
      const navigationWindow = createFakeNavigationWindow();
      const adapter = createNavigationAdapter(navigationWindow);

      adapter.subscribe(() => {});
      adapter.trackLoad?.(Promise.reject(new Error("load failed")));
      navigationWindow.dispatchNavigate("https://example.com/docs", "push");

      const handler = navigationWindow.lastInterceptOptions?.handler;

      await expect(Promise.resolve(handler?.())).resolves.toBeUndefined();

      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("resolves the intercept handler when no load was tracked", async () => {
    const navigationWindow = createFakeNavigationWindow();
    const adapter = createNavigationAdapter(navigationWindow);

    adapter.subscribe(() => {});
    navigationWindow.dispatchNavigate("https://example.com/docs", "push");

    const handler = navigationWindow.lastInterceptOptions?.handler;

    await expect(Promise.resolve(handler?.())).resolves.toBeUndefined();
  });

  it("leaves scroll and focus to the router for the navigations it asks for", () => {
    const navigationWindow = createFakeNavigationWindow();
    const adapter = createNavigationAdapter(navigationWindow);

    adapter.subscribe(() => {});

    // Left to the browser, an intercepted push or replace scrolls to the top
    // and moves focus to <body> once the handler settles.
    adapter.navigate("/docs");
    expect(navigationWindow.lastInterceptOptions).toMatchObject({
      focusReset: "manual",
      scroll: "manual",
    });

    navigationWindow.lastInterceptOptions = undefined;
    adapter.navigate("/docs?page=2", { replace: true });
    expect(navigationWindow.lastInterceptOptions).toMatchObject({
      focusReset: "manual",
      scroll: "manual",
    });
  });

  it("keeps the browser's scroll and focus handling for navigations it did not ask for", () => {
    const navigationWindow = createFakeNavigationWindow();
    const adapter = createNavigationAdapter(navigationWindow);

    adapter.subscribe(() => {});
    adapter.navigate("/docs");

    for (const navigationType of ["traverse", "push", "replace", "reload"]) {
      navigationWindow.dispatchNavigate(
        "https://example.com/elsewhere",
        navigationType,
      );

      expect(navigationWindow.lastInterceptOptions).not.toHaveProperty(
        "focusReset",
      );
      expect(navigationWindow.lastInterceptOptions).not.toHaveProperty(
        "scroll",
      );
    }
  });

  it("stops claiming navigations once a navigate() call throws", () => {
    const navigationWindow = createFakeNavigationWindow();
    const adapter = createNavigationAdapter(navigationWindow);
    const navigate = navigationWindow.navigation.navigate;

    adapter.subscribe(() => {});
    navigationWindow.navigation.navigate = () => {
      throw new TypeError("Invalid URL");
    };

    expect(() => {
      adapter.navigate("http://[");
    }).toThrow("Invalid URL");

    navigationWindow.navigation.navigate = navigate;
    navigationWindow.dispatchNavigate("https://example.com/back", "traverse");

    expect(navigationWindow.lastInterceptOptions).not.toHaveProperty("scroll");
  });
});
