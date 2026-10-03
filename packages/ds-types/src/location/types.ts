/**
 * The location query port. A component reads and writes the URL's query
 * through `LocationQuery`, and a router or host provides `LocationAdapter`.
 * The types sit together because each describes one side of the same seam.
 */

/**
 * How a write enters history: `push` appends an entry the Back button returns
 * to, `replace` overwrites the current one.
 *
 * @experimental Names may change until the first consumers adopt this surface.
 */
export type HistoryBehavior = "push" | "replace";

/**
 * Options for {@link LocationQuery.write}.
 *
 * @experimental Names may change until the first consumers adopt this surface.
 */
export type LocationWriteOptions = {
  /** How the write enters history. Defaults to `"replace"`. */
  readonly history?: HistoryBehavior;
};

/**
 * Options for {@link LocationAdapter.navigate}.
 *
 * @experimental Names may change until the first consumers adopt this surface.
 */
export type LocationNavigateOptions = {
  /** Replace the current history entry instead of appending one. */
  readonly replace?: boolean;
};

/**
 * The query string of the current URL, read and written as a whole.
 *
 * A component that keeps state in the URL goes through this port instead of
 * `window.location` or a particular router. Repeated parameters
 * (`status=failed&status=cancelled`) survive reads and writes.
 *
 * @experimental Names may change until the first consumers adopt this surface.
 */
export type LocationQuery = {
  /**
   * The current query parameters, decoded, as a fresh `URLSearchParams` on
   * every call. Callers may mutate the result.
   */
  readonly read: () => URLSearchParams;
  /**
   * Replace the whole query with `next`, keeping the path and the hash.
   * `next` is serialised with `URLSearchParams.toString()`, which uses form
   * encoding (spaces as `+`). `read()` decodes, so encoding differences do not
   * reach consumers. Throws when the adapter cannot navigate, as with
   * router-core's `createServerAdapter`.
   *
   * @note Impure: navigates the underlying adapter.
   */
  readonly write: (
    next: URLSearchParams,
    options?: LocationWriteOptions,
  ) => void;
  /**
   * Call `listener` with no arguments on every change of the URL, whatever
   * caused it. Returns a function that unsubscribes. A listener's exception
   * reaches the caller of `write` only when the adapter notifies
   * synchronously. Otherwise it surfaces wherever the adapter dispatches, for
   * example on Back or Forward.
   */
  readonly subscribe: (listener: () => void) => () => void;
};

/**
 * The three functions a router or host provides so a {@link LocationQuery}
 * can run over it. The platform adapters of `@canonical/router-core` fit by
 * shape. Another router fits by wrapping its location getter, navigate
 * function and change listener.
 *
 * An implementation must:
 *
 * - notify at most once per write;
 * - land writes in the order they were made;
 * - never reorder or re-encode the parameters it is given;
 * - never drop a write silently, but notify where the location then stands,
 *   or throw.
 *
 * A write may land after `navigate` returns, as long as the notification
 * follows it.
 *
 * @experimental Names may change until the first consumers adopt this surface.
 */
export type LocationAdapter = {
  /**
   * The current location: an absolute URL, or a root-relative href starting
   * with `/` such as `/machines?status=failed`. A value not starting with `/`
   * is resolved against `/`.
   */
  readonly getLocation: () => string | URL;
  /**
   * Navigate to `url`, a root-relative href. An adapter that cannot navigate
   * throws.
   */
  readonly navigate: (url: string, options?: LocationNavigateOptions) => void;
  /**
   * Call `listener` on every change of the location, including Back, Forward
   * and navigations made elsewhere. Returns a function that unsubscribes.
   */
  readonly subscribe: (listener: () => void) => () => void;
};
