/**
 * The location port: what a location reads and writes, the configuration
 * of the memory one, and the platform surface the platform one composes.
 * The live query authority for a collection: reads and writes preserve
 * repeated parameters (`status=failed&status=cancelled`), and there is no
 * scalar flattening anywhere in the port.
 */

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
 * The location port: where a collection's applied query lives. A URL
 * through `createPlatformLocation`, a memory location for a secondary
 * collection or a test, or an adapter of the application's own.
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
   * Write the full query parameter set. On history-backed locations,
   * `history: "push"` appends an entry and the default replaces, so
   * continuous input does not flood history; the memory location has no
   * history stack and ignores the option.
   */
  readonly write: (
    next: URLSearchParams,
    options?: { readonly history?: "push" | "replace" },
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
