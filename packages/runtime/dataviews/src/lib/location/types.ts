/**
 * The Location port: the live query authority for a collection. Reads and
 * writes preserve repeated parameters (`status=failed&status=cancelled`);
 * there is no scalar flattening anywhere in the port.
 */

/** Configuration of one Location. */
export type LocationConfig = {
  /** The initial href; defaults to the local base with no query. */
  readonly href?: string;
};

/** Handle of one Location. */
export type Location = {
  /**
   * The current query parameters as a fresh URLSearchParams — callers may
   * mutate the returned object; the Location's own state never aliases it.
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
