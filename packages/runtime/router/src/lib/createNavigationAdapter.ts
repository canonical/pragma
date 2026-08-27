import type { PlatformAdapter, PlatformNavigateOptions } from "./types.js";

interface NavigationResultLike {
  readonly committed?: Promise<unknown>;
  readonly finished?: Promise<unknown>;
}

interface NavigationLike {
  readonly currentEntry: { readonly url: string | null } | null;
  navigate(
    url: string,
    options?: { history?: "push" | "replace" },
  ): NavigationResultLike | undefined;
  addEventListener(
    type: "navigate",
    listener: (event: NavigateEventLike) => void,
  ): void;
  removeEventListener(
    type: "navigate",
    listener: (event: NavigateEventLike) => void,
  ): void;
}

interface NavigateEventLike {
  readonly navigationType: string;
  readonly destination: { readonly url: string };
  readonly canIntercept: boolean;
  readonly hashChange: boolean;
  intercept(options?: { handler?: () => void | Promise<void> }): void;
}

interface NavigationWindowLike {
  readonly navigation: NavigationLike;
  readonly location: { readonly href: string };
}

/**
 * Intentional no-op `.catch()` handler for the Navigation API's transition
 * promises.
 *
 * `navigation.navigate()` returns a `{ committed, finished }` promise pair;
 * either can reject when a navigation is superseded, aborted, or immediately
 * cancelled.  Those rejections are harmless to the router — subscribers were
 * already notified and a superseding navigation carries its own notification —
 * so this handler only prevents unhandled promise rejections without
 * swallowing errors that matter.
 */
function ignoreNavigationTransitionError(_error: unknown): void {}

function getDefaultNavigationWindow(): NavigationWindowLike {
  const win = globalThis as { window?: NavigationWindowLike };

  if (!win.window || !("navigation" in win.window)) {
    throw new Error(
      "Navigation adapter requires a window with the Navigation API.",
    );
  }

  return win.window;
}

/** Create a Navigation API adapter using `window.navigation`. */
export default function createNavigationAdapter(
  navigationWindow: NavigationWindowLike = getDefaultNavigationWindow(),
): PlatformAdapter {
  const subscribers = new Set<(location: string | URL) => void>();
  const navigation = navigationWindow.navigation;
  let trackedLoad: Promise<void> | null = null;

  function getLocation(): URL {
    return new URL(navigationWindow.location.href);
  }

  function notify(): void {
    const location = getLocation();

    for (const subscriber of subscribers) {
      subscriber(new URL(location.href));
    }
  }

  function handleNavigate(event: NavigateEventLike): void {
    if (!event.canIntercept || event.hashChange) {
      return;
    }

    // Intercept all same-origin navigations to prevent full page reloads.
    // The router handles the URL update and re-render internally.  The
    // handler hands the browser the router's in-flight load (tracked via
    // trackLoad below), so native loading UI reflects the navigation.  It
    // reads trackedLoad at call time — the router tracks the load
    // synchronously during the navigate event (via notify() here, or right
    // after its own navigation.navigate() call), and intercept handlers run
    // on a later microtask.  A failed load still commits router state, so
    // the handler never rejects — it must not mark the browser navigation
    // as failed.
    event.intercept({
      handler: () =>
        Promise.resolve(trackedLoad).then(
          () => undefined,
          ignoreNavigationTransitionError,
        ),
    });

    if (
      event.navigationType === "traverse" ||
      event.navigationType === "reload"
    ) {
      notify();
    }
  }

  return {
    getLocation() {
      return getLocation();
    },
    navigate(url, navigationOptions?: PlatformNavigateOptions) {
      const result = navigation.navigate(url, {
        history: navigationOptions?.replace ? "replace" : "push",
      });

      result?.committed?.catch(ignoreNavigationTransitionError);
      result?.finished?.catch(ignoreNavigationTransitionError);

      notify();
    },
    trackLoad(load) {
      trackedLoad = load;
    },
    subscribe(callback) {
      const shouldAttachListener = subscribers.size === 0;

      subscribers.add(callback);

      if (shouldAttachListener) {
        navigation.addEventListener("navigate", handleNavigate);
      }

      return () => {
        subscribers.delete(callback);

        if (subscribers.size === 0) {
          navigation.removeEventListener("navigate", handleNavigate);
        }
      };
    },
  };
}
