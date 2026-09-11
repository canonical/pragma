import type { CollectionCoordinatorState } from "@canonical/dataviews-core";

/** What the pagination bar shows and offers for one collection snapshot. */
export type PaginationState = {
  /** The window's page, counted from one. */
  readonly page: number;
  /** How many rows a page holds. */
  readonly size: number;
  /**
   * How many rows are on screen, or null while those rows do not answer the
   * current query: nothing has arrived yet, a replacement is in flight, or it
   * failed and left an earlier query's rows in view.
   */
  readonly shown: number | null;
  /** The filtered total, when the source publishes one for this query. */
  readonly total: number | null;
  /** How many pages the total makes, when there is a total. */
  readonly pages: number | null;
  /** Whether a later page is known to exist. */
  readonly hasNext: boolean;
  /**
   * Where Previous goes. A page past the last — an old link, a shrunken
   * result — steps back to the last page there is, not one page at a time.
   */
  readonly back: number;
  /** The page sizes offered, each once, always including the applied one. */
  readonly sizes: readonly number[];
};

/**
 * Derive the bar's state from the provider's snapshot.
 *
 * The destinations are the ones the collection can actually reach. A source
 * that publishes a filtered total gets a last page; one that publishes no
 * count gets a Next offered only while the page is full, and no invented
 * last page. A total that belongs to an earlier query is not this one's.
 */
export default function paginationState(
  snapshot: CollectionCoordinatorState<object>,
  sizes: readonly number[],
): PaginationState {
  const { page, size } = snapshot.window;
  const current = snapshot.resultsMatchCurrentQuery;
  const rows = snapshot.result.rows;
  const total = current ? snapshot.result.count : null;
  const pages = total === null ? null : Math.max(1, Math.ceil(total / size));
  // Without a total, a full page means there may be another. Rows from an
  // older query prove nothing.
  const pageIsFull = rows !== null && rows.length === size;
  const given = [...new Set(sizes)];
  return {
    page,
    size,
    shown: current && rows !== null ? rows.length : null,
    total,
    pages,
    hasNext: pages === null ? pageIsFull && current : page < pages,
    back: pages !== null && page > pages ? pages : page - 1,
    sizes: given.includes(size)
      ? given
      : [...given, size].sort((a, b) => a - b),
  };
}
