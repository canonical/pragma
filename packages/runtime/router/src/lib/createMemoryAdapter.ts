import type { MemoryAdapter, PlatformNavigateOptions } from "./types.js";

function buildUrl(input: string | URL, base: string | URL): URL {
  if (input instanceof URL) {
    return new URL(input.href);
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return new URL(input);
  }

  return new URL(input, base);
}

/** Create an in-memory history adapter for tests and non-browser runtimes. */
export default function createMemoryAdapter(
  initialUrl: string | URL = "/",
): MemoryAdapter {
  const subscribers = new Set<(location: string | URL) => void>();
  const entries = [buildUrl(initialUrl, "https://router.local")];
  let index = 0;

  function notify(): void {
    const location = entries[index];

    for (const subscriber of subscribers) {
      subscriber(new URL(location.href));
    }
  }

  function commit(
    input: string | URL,
    navigationOptions?: PlatformNavigateOptions,
  ): void {
    const nextUrl = buildUrl(input, entries[index]);

    if (navigationOptions?.replace) {
      entries[index] = nextUrl;
    } else {
      entries.splice(index + 1, entries.length - index - 1, nextUrl);
      index = entries.length - 1;
    }

    notify();
  }

  return {
    back() {
      if (index === 0) {
        return;
      }

      index -= 1;
      notify();
    },
    forward() {
      if (index >= entries.length - 1) {
        return;
      }

      index += 1;
      notify();
    },
    getLocation() {
      return new URL(entries[index].href);
    },
    navigate(url, navigationOptions) {
      commit(url, navigationOptions);
    },
    subscribe(callback) {
      subscribers.add(callback);

      return () => {
        subscribers.delete(callback);
      };
    },
  };
}
