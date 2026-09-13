/**
 * Hook domain types for the DataTable domain. Each hook declares its result
 * type here; a hook's config type lives beside it when the hook takes one.
 */

/** One table's resolved geometry. */
export type UseTableGeometryResult = {
  /**
   * Attaches the container whose inline size the solver resolves against,
   * returning the detach when there is an observer to disconnect. A React 19
   * ref callback that returns a cleanup is never called with `null`, so the
   * node is always a real one.
   */
  readonly attach: (node: HTMLDivElement) => (() => void) | undefined;
  /**
   * Attaches the cell the stylesheet's selection track sizes, whose width
   * the columns leave; the cleanup gives it back.
   */
  readonly reserve: (cell: HTMLDivElement) => () => void;
  /**
   * The shared track list every row of this table consumes; undefined with
   * no columns, where there is no track to publish.
   */
  readonly template: string | undefined;
  /** The resolved widths, positionally aligned with the column ids. */
  readonly widths: readonly number[];
};
