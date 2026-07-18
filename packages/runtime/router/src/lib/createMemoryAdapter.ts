import { ROUTER_LOCAL_BASE } from "./constants.js";
import type {
  MemoryAdapter,
  MemoryAdapterOptions,
  MemoryHistoryDelegate,
  PlatformNavigateOptions,
} from "./types.js";

function resolveUrl(input: string | URL, base: string | URL): URL {
  if (input instanceof URL) {
    return new URL(input.href);
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return new URL(input);
  }

  return new URL(input, base);
}

/**
 * Create a memory adapter whose location is owned by a host through a delegate.
 *
 * The adapter keeps no entries array and no index: `getLocation` reads the
 * delegate, `navigate` forwards to the delegate, and change notification is the
 * delegate's own subscription surface. Back and forward forward to the optional
 * `onBack`/`onForward` hooks when the host provides them; when it does not they
 * are no-ops, because a host that owns location owns its own history model and
 * the adapter has no stack of its own to walk.
 */
function createDelegatedMemoryAdapter(
  delegate: MemoryHistoryDelegate,
): MemoryAdapter {
  return {
    back() {
      delegate.onBack?.();
    },
    forward() {
      delegate.onForward?.();
    },
    getLocation() {
      return delegate.getLocation();
    },
    navigate(url, navigationOptions) {
      delegate.onNavigate(url, navigationOptions);
    },
    subscribe(callback) {
      return delegate.subscribe(callback);
    },
  };
}

/**
 * Create an in-memory history adapter for tests and non-browser runtimes.
 *
 * By default the adapter owns its location state: it keeps an internal entries
 * array and index that `navigate`, `back`, and `forward` mutate. Pass
 * `options.history` to delegate location ownership to a host instead, turning
 * the adapter into a pure resolver over a location the host supplies.
 */
export default function createMemoryAdapter(
  initialUrl: string | URL = "/",
  options?: MemoryAdapterOptions,
): MemoryAdapter {
  if (options?.history) {
    return createDelegatedMemoryAdapter(options.history);
  }

  const subscribers = new Set<(location: string | URL) => void>();
  const entries = [resolveUrl(initialUrl, ROUTER_LOCAL_BASE)];
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
    const nextUrl = resolveUrl(input, entries[index]);

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
