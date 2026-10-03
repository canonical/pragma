/**
 * The location query port: how a component reads and writes the URL's query
 * string without touching `window` or a particular router.
 *
 * `LocationAdapter` is the surface a router or host provides, `LocationQuery`
 * is the surface a component consumes, and `HistoryBehavior` is how a write
 * enters history. `createLocationQuery` bridges the first to the second. Reads
 * and writes preserve repeated parameters (`status=failed&status=cancelled`):
 * nothing in the port flattens a parameter to a single value.
 */

/**
 * How a write enters a history-backed location: `push` appends an entry the
 * Back button returns to, `replace` respells the current one.
 *
 * @experimental The location query surface settles once its first consumers
 * adopt it, and this name may change until then.
 */
export type HistoryBehavior = "push" | "replace";

/**
 * The query string of the current URL, read and written as a whole.
 *
 * This is the one seam between a component that keeps state in the URL and
 * whatever owns the URL. The component never reads the browser's location or
 * touches its history itself, so it renders on the server and works under any
 * router. `createLocationQuery` builds one over a {@link LocationAdapter}.
 *
 * What an implementation provides:
 *
 * - `read()` returns the current query string, repeated parameters intact.
 * - `write(next, { history })` replaces the URL's query string with the given
 *   parameters, keeps the path and the hash, and enters history in the
 *   behavior asked for. The consumer decides the behavior per write; the
 *   implementation carries it out.
 * - `subscribe(listener)` calls the listener whenever the URL changes,
 *   whatever moved it: a write through this port, Back or Forward, or a
 *   navigation the router made itself. The listener takes no payload and
 *   calls `read()`.
 *
 * What an implementation guarantees, so a consumer can tell its own writes
 * from other moves:
 *
 * - A write through the port is observed by the port's own subscribers at
 *   most once. It is observed once, when the write lands, or not at all if
 *   the router notifies only of navigations it did not make. A consumer
 *   recognises the echo of its write by the spelling it wrote, and tolerates
 *   the echo's absence. It must never see one write as two moves.
 * - A write may land after `write` returns, as with a router that applies the
 *   navigation later, provided the router notifies as each write lands.
 * - A write lands as it was spelled: its parameters in the order and encoding
 *   given. A consumer may respell a query that arrives out of its canonical
 *   spelling. An implementation that reorders or re-encodes what it is given
 *   would therefore be respelled and rewritten without end.
 * - Writes land in the order they were made. A consumer reads a write that
 *   lands after one made later as somebody else's move.
 * - A router must not drop a write silently. When it skips or abandons one,
 *   it notifies subscribers of where the location then stands, or it throws.
 *
 * @experimental The location query surface settles once its first consumers
 * adopt it, and this name may change until then.
 */
export type LocationQuery = {
  /**
   * The current query parameters as a fresh `URLSearchParams` on every call.
   * Callers may mutate the returned object, because the location's own state
   * never aliases it.
   */
  readonly read: () => URLSearchParams;
  /**
   * Replace the whole query string with `next`, keeping the path and the hash.
   * `history` says whether the write appends a history entry or respells the
   * current one, and defaults to `"replace"`.
   */
  readonly write: (
    next: URLSearchParams,
    options?: { readonly history?: HistoryBehavior },
  ) => void;
  /**
   * Call `listener` on every change of the URL. The return value
   * unsubscribes. A throwing listener aborts the notification, and the
   * exception propagates to whoever made the change.
   */
  readonly subscribe: (listener: () => void) => () => void;
};

/**
 * The three functions a router or host provides so a {@link LocationQuery}
 * can run over it.
 *
 * The members match the read, navigate and subscribe members of
 * `@canonical/router-core`'s platform adapters, so every adapter that package
 * creates (browser, memory, server and the rest) is a `LocationAdapter` by
 * shape, with no dependency between the packages. Any other router fits by
 * wrapping its own location getter, navigate function and change listener.
 *
 * @experimental The location query surface settles once its first consumers
 * adopt it, and this name may change until then.
 */
export type LocationAdapter = {
  /**
   * The current location, as an absolute URL string, a path-relative href
   * such as `/machines?status=failed`, or a `URL` object.
   */
  readonly getLocation: () => string | URL;
  /**
   * Navigate to `url`, a path-relative href. `replace: true` respells the
   * current history entry instead of appending one.
   */
  readonly navigate: (
    url: string,
    options?: { readonly replace?: boolean },
  ) => void;
  /**
   * Call `listener` with the new location on every change. The return value
   * unsubscribes.
   */
  readonly subscribe: (
    listener: (location: string | URL) => void,
  ) => () => void;
};
