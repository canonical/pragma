import type { PlatformAdapter, PlatformNavigateOptions } from "./types.js";

interface BrowserLocationLike {
  href: string;
}

interface BrowserHistoryLike {
  pushState(state: unknown, unused: string, url?: string | URL | null): void;
  replaceState(state: unknown, unused: string, url?: string | URL | null): void;
}

interface BrowserWindowLike {
  readonly history: BrowserHistoryLike;
  readonly location: BrowserLocationLike;
  addEventListener(type: "popstate", listener: () => void): void;
  removeEventListener(type: "popstate", listener: () => void): void;
}

function getDefaultBrowserWindow(): BrowserWindowLike {
  const browserWindow = (globalThis as { window?: BrowserWindowLike }).window;

  if (!browserWindow) {
    throw new Error("Browser adapter requires a window-like object.");
  }

  return browserWindow;
}

/** Create a History API adapter backed by `pushState` and `popstate`. */
export default function createHistoryAdapter(
  browserWindow: BrowserWindowLike = getDefaultBrowserWindow(),
): PlatformAdapter {
  const subscribers = new Set<(location: string | URL) => void>();

  function getLocation(): URL {
    return new URL(browserWindow.location.href);
  }

  function notify(): void {
    const location = getLocation();

    for (const subscriber of subscribers) {
      subscriber(new URL(location.href));
    }
  }

  function handlePopState(): void {
    notify();
  }

  return {
    getLocation() {
      return getLocation();
    },
    navigate(url, navigationOptions?: PlatformNavigateOptions) {
      if (navigationOptions?.replace) {
        browserWindow.history.replaceState(navigationOptions.state, "", url);
      } else {
        browserWindow.history.pushState(navigationOptions?.state, "", url);
      }

      notify();
    },
    subscribe(callback) {
      const shouldAttachListener = subscribers.size === 0;

      subscribers.add(callback);

      if (shouldAttachListener) {
        browserWindow.addEventListener("popstate", handlePopState);
      }

      return () => {
        subscribers.delete(callback);

        if (subscribers.size === 0) {
          browserWindow.removeEventListener("popstate", handlePopState);
        }
      };
    },
  };
}
