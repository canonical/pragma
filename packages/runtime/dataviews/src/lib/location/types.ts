/**
 * The location port: what a location reads and writes, the configuration
 * of the memory one, and the platform surface the platform one composes.
 * The live query authority for a collection: reads and writes preserve
 * repeated parameters (`status=failed&status=cancelled`), and there is no
 * scalar flattening anywhere in the port.
 */

/**
 * How a write enters a history-backed location: `push` appends an entry
 * Back returns from, `replace` respells the current one.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type HistoryMode = "push" | "replace";

/**
 * Configuration of one memory location.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type MemoryLocationConfig = {
  /** The initial href; defaults to the local base with no query. */
  readonly href?: string | undefined;
};

/**
 * The location port: where a collection's applied query lives, and the one
 * seam between the provider and a router. Everything the provider does to
 * the URL goes through this port — it never reads the browser's location
 * or touches its history itself — so an application hands it the adapter
 * of its own router: `createPlatformLocation` over `@canonical/router-core`,
 * `createMemoryLocation` for a secondary collection or a test, or three
 * functions of the application's own over TanStack Router, React Router or
 * a framework's navigation.
 *
 * What an adapter implements:
 *
 * - `read()` — the current query string, repeated parameters intact.
 * - `write(params, { history })` — replace the URL's query string with the
 *   given parameters, keeping the path and the hash, and enter the
 *   router's history in the mode asked for: `push` appends an entry Back
 *   returns from, `replace` respells the current one. The provider decides
 *   the mode per transition; the adapter carries it out.
 * - `subscribe(listener)` — call the listener whenever the URL changes,
 *   whatever moved it: a write through this port, Back or Forward, or a
 *   navigation the router made itself. The listener takes no payload and
 *   calls `read()`.
 *
 * What an adapter guarantees, so the provider's echo rule holds: a write
 * through the port is observed by the port's own subscribers at most once
 * — once, synchronously or before the next write returns, or not at all if
 * the router notifies only on navigations it did not make. The provider
 * recognises the echo by the spelling it wrote and tolerates its absence;
 * it must never see one write as two moves.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type QueryLocation = {
  /**
   * The current query parameters as a fresh URLSearchParams — callers may
   * mutate the returned object; the location's own state never aliases it.
   */
  readonly read: () => URLSearchParams;
  /**
   * Write the full query parameter set. On history-backed locations
   * `history` says whether the write appends an entry or respells the
   * current one, and the default replaces; the memory location has no
   * history stack and ignores the option.
   */
  readonly write: (
    next: URLSearchParams,
    options?: { readonly history?: HistoryMode },
  ) => void;
  /**
   * Subscribe to every change; the return value unsubscribes. A throwing
   * listener aborts the publication and the exception propagates to the
   * writer.
   */
  readonly subscribe: (listener: () => void) => () => void;
};

/**
 * The minimal platform surface a location adapter composes — satisfied
 * structurally by @canonical/router-core's `PlatformAdapter` without a
 * dependency edge. Only the read, write and subscribe members: platform navigation
 * state payloads are not part of the port.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PlatformLocation = {
  readonly getLocation: () => string | URL;
  readonly navigate: (
    url: string,
    options?: { readonly replace?: boolean },
  ) => void;
  readonly subscribe: (
    listener: (location: string | URL) => void,
  ) => () => void;
};
