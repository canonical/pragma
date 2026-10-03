import type { LocationAdapter, LocationQuery } from "@canonical/ds-types";

/**
 * Parse a location into a fresh `URL`. An absolute URL ignores the base. A
 * root-relative href resolves against a placeholder origin, because only the
 * path, query and hash are read.
 */
const resolveUrl = (location: string | URL): URL =>
  new URL(location, "http://localhost/");

/**
 * Create a {@link LocationQuery} over a {@link LocationAdapter}.
 *
 * A write navigates the adapter to the current path and hash with the new
 * query. The adapter's own subscription then reports it like any other
 * navigation. Create the port once per adapter, not on every render, because
 * each call returns new functions.
 *
 * @param adapter - The router's or host's location getter, navigate function
 *   and change listener
 * @returns The query port over that adapter
 * @note The returned `write` is impure: it navigates the adapter.
 *
 * @experimental Names may change until the first consumers adopt this surface.
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
    subscribe: (listener) => adapter.subscribe(() => listener()),
  };
}
