import type {
  HistoryBehavior,
  LocationAdapter,
  LocationQuery,
} from "@canonical/ds-types";

/**
 * Parse a location into a fresh `URL`. A path-relative href resolves against
 * a placeholder origin, because only its path, query and hash are read.
 */
const resolveUrl = (location: string | URL): URL => {
  if (location instanceof URL) {
    return new URL(location.href);
  }
  if (location.startsWith("http://") || location.startsWith("https://")) {
    return new URL(location);
  }
  return new URL(location, "http://localhost/");
};

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
    read(): URLSearchParams {
      return new URLSearchParams(resolveUrl(adapter.getLocation()).search);
    },
    write(
      next: URLSearchParams,
      options?: { readonly history?: HistoryBehavior },
    ): void {
      const current = resolveUrl(adapter.getLocation());
      const search = next.toString();
      const query = search === "" ? "" : `?${search}`;
      adapter.navigate(`${current.pathname}${query}${current.hash}`, {
        // Replace by default, so continuous input does not flood history;
        // only an explicit push appends an entry.
        replace: options?.history !== "push",
      });
    },
    subscribe(listener: () => void): () => void {
      return adapter.subscribe(() => {
        listener();
      });
    },
  };
}
