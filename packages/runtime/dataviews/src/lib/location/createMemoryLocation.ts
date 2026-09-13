import type { Location, LocationConfig } from "./types.js";

/** The parsing base for relative hrefs; never surfaced through the port. */
const LOCAL_BASE = "http://localhost/";

/**
 * Create a memory Location: the query authority for local or secondary
 * collections, and the fixture harness for URL-backed transport tests.
 * Repeated parameters survive every read and write. The host name in the
 * base URL is a parsing detail only — it never reaches consumers through
 * the port. There is no history stack; the write `history` option is
 * accepted and ignored.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createMemoryLocation(
  config: LocationConfig = {},
): Location {
  let current = new URL(config.href ?? "/", LOCAL_BASE);
  const listeners = new Set<() => void>();

  return {
    read(): URLSearchParams {
      return new URLSearchParams(current.search);
    },
    write(
      next: URLSearchParams,
      options?: { readonly history?: "push" | "replace" },
    ): void {
      void options;
      const search = next.toString();
      current = new URL(
        `${current.pathname}${search === "" ? "" : `?${search}`}${current.hash}`,
        LOCAL_BASE,
      );
      for (const listener of [...listeners]) {
        listener();
      }
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
