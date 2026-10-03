import type { LocationAdapter, LocationQuery } from "@canonical/ds-types";

/**
 * Parse a location into a fresh `URL`. A path-relative href resolves against
 * a placeholder origin, because only its path, query and hash are read.
 */
const resolveUrl = (location: string | URL): URL =>
  new URL(location, "http://localhost/");

/**
 * Create a {@link LocationQuery} over a {@link LocationAdapter}.
 *
 * Reads parse the adapter's current location, so repeated parameters survive.
 * Writes navigate the adapter to the current path with the new query and the
 * current hash, so the adapter's own subscription picks the change up like any
 * other navigation.
 *
 * @param adapter - The router's or host's location getter, navigate function
 *   and change listener
 * @returns The query port over that adapter
 * @note The returned `write` is impure: it navigates the adapter.
 *
 * @experimental The location query surface settles once its first consumers
 * adopt it, and this name may change until then.
 */
export default function createLocationQuery(
  adapter: LocationAdapter,
): LocationQuery {
  return {
    read: () => new URLSearchParams(resolveUrl(adapter.getLocation()).search),
    write: (next, options) => {
      const url = resolveUrl(adapter.getLocation());
      url.search = next.toString();
      adapter.navigate(url.pathname + url.search + url.hash, {
        replace: options?.history !== "push",
      });
    },
    subscribe: (listener) => adapter.subscribe(listener),
  };
}
