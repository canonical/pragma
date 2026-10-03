import type { LocationAdapter } from "@canonical/ds-types";

/** A `LocationAdapter` over an in-memory history stack, with Back and Forward. */
type FakeLocationAdapter = LocationAdapter & {
  readonly back: () => void;
  readonly forward: () => void;
};

/**
 * Create a `LocationAdapter` that keeps its history in memory and notifies
 * subscribers synchronously on every navigation, Back and Forward.
 *
 * @param initial - The first history entry, as a string or a `URL`
 */
export default function createFakeLocationAdapter(
  initial: string | URL = "/",
): FakeLocationAdapter {
  const entries: (string | URL)[] = [initial];
  let index = 0;
  const listeners = new Set<(location: string | URL) => void>();

  const notifyListeners = (): void => {
    for (const listener of [...listeners]) {
      listener(entries[index] ?? initial);
    }
  };

  return {
    getLocation: () => entries[index] ?? initial,
    navigate(url, options) {
      if (options?.replace) {
        entries[index] = url;
      } else {
        entries.splice(index + 1, entries.length, url);
        index += 1;
      }
      notifyListeners();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    back() {
      if (index > 0) {
        index -= 1;
        notifyListeners();
      }
    },
    forward() {
      if (index < entries.length - 1) {
        index += 1;
        notifyListeners();
      }
    },
  };
}
