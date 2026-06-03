import { ROUTER_LOCAL_BASE } from "./constants.js";
import type { PlatformAdapter, PlatformNavigateOptions } from "./types.js";

interface HashWindowLike {
  readonly location: { hash: string; href: string };
  addEventListener(type: "hashchange", listener: () => void): void;
  removeEventListener(type: "hashchange", listener: () => void): void;
}

function getDefaultWindow(): HashWindowLike {
  const browserWindow = (globalThis as { window?: HashWindowLike }).window;

  if (!browserWindow) {
    throw new Error("Hash adapter requires a window-like object.");
  }

  return browserWindow;
}

function hashToPathname(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;

  return raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * Create a hash-based adapter that stores the route in `window.location.hash`.
 *
 * Useful for environments without a real server (Storybook, static file hosts)
 * where the URL path is fixed and only the fragment can change.
 */
export default function createHashAdapter(
  browserWindow: HashWindowLike = getDefaultWindow(),
): PlatformAdapter {
  const subscribers = new Set<(location: string | URL) => void>();

  function getLocation(): URL {
    const pathname = hashToPathname(browserWindow.location.hash);

    return new URL(pathname, ROUTER_LOCAL_BASE);
  }

  function notify(): void {
    const location = getLocation();

    for (const subscriber of subscribers) {
      subscriber(new URL(location.href));
    }
  }

  function handleHashChange(): void {
    notify();
  }

  return {
    getLocation() {
      return getLocation();
    },
    navigate(url, _navigationOptions?: PlatformNavigateOptions) {
      const parsed =
        url.startsWith("http://") || url.startsWith("https://")
          ? new URL(url)
          : new URL(url, ROUTER_LOCAL_BASE);

      browserWindow.location.hash = `#${parsed.pathname}${parsed.search}${parsed.hash}`;
    },
    subscribe(callback) {
      const shouldAttachListener = subscribers.size === 0;

      subscribers.add(callback);

      if (shouldAttachListener) {
        browserWindow.addEventListener("hashchange", handleHashChange);
      }

      return () => {
        subscribers.delete(callback);

        if (subscribers.size === 0) {
          browserWindow.removeEventListener("hashchange", handleHashChange);
        }
      };
    },
  };
}
