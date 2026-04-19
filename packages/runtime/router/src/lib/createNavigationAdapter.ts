import type { PlatformAdapter, PlatformNavigateOptions } from "./types.js";

interface NavigationLike {
  readonly currentEntry: { readonly url: string | null } | null;
  navigate(url: string, options?: { history?: "push" | "replace" }): void;
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

    if (event.navigationType === "push" || event.navigationType === "replace") {
      return;
    }

    notify();
  }

  return {
    getLocation() {
      return getLocation();
    },
    navigate(url, navigationOptions?: PlatformNavigateOptions) {
      navigation.navigate(url, {
        history: navigationOptions?.replace ? "replace" : "push",
      });

      notify();
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
