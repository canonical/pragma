import type {
  CollectionState,
  SourceCapabilities,
} from "@canonical/dataviews-core";

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
  /**
   * How many rows the window pages over, when the source counts them
   * exactly for this query. A lower bound is not a total and is not one.
   */
  readonly total: number | null;
  /**
   * How many pages the total makes, when the source reaches pages by
   * number and there is a total. Null where no page can be addressed by
   * number: a forward cursor source knowing its own size still cannot be
   * asked for its fifth page.
   */
  readonly pages: number | null;
  /** Whether a later page is known to exist. */
  readonly hasNext: boolean;
  /**
   * Where Previous goes. A page past the last — an old link, a shrunken
   * result — steps back to the last page there is, not one page at a time.
   */
  readonly back: number;
  /**
   * The token the next page starts at, where the source hands tokens back.
   * Null for an offset source, which reaches its pages by number alone.
   */
  readonly nextCursor: string | null;
  /** The token `back` starts at, on a source that pages both ways. */
  readonly backCursor: string | null;
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
  snapshot: CollectionState<object>,
  sizes: readonly number[],
  pagination: SourceCapabilities["pagination"] | null = null,
): PaginationState {
  const { page, size } = snapshot.window;
  const current = snapshot.resultMatchesQuery;
  const rows = snapshot.result.rows;
  // A page is addressable by number unless the source says it reaches its
  // pages only through the tokens an adjacent page hands back.
  const byNumber = pagination === null || pagination.mode === "offset";
  // Only the rows the window pages over can say how many pages there are,
  // and only an exact count of them can.
  const visible = snapshot.result.counts?.visible;
  const total =
    current && visible !== undefined && visible.kind === "exact"
      ? visible.value
      : null;
  // A count is still worth showing where no page can be jumped to; a page
  // total is not, because it would name destinations nothing reaches.
  const pages =
    total === null || !byNumber ? null : Math.max(1, Math.ceil(total / size));
  // Without a page total: the token this page handed back, then the
  // source's own word, then a full page meaning there may be another. Rows
  // from an older query prove nothing.
  // Only where pages are reached by token: an offset source may hand
  // cursors back, and sending one back to it is a page it refuses.
  const cursors = current && !byNumber ? snapshot.result.cursors : null;
  const more = current ? snapshot.result.more : null;
  const pageIsFull = rows !== null && rows.length === size;
  const given = [...new Set(sizes)];
  /** Whether a later page exists, by the strongest authority that answers. */
  const hasNext = (): boolean => {
    if (pages !== null) {
      return page < pages;
    }
    if (cursors !== null) {
      return cursors.next !== null;
    }
    return more ?? (pageIsFull && current);
  };
  return {
    page,
    size,
    shown: current && rows !== null ? rows.length : null,
    total,
    pages,
    hasNext: hasNext(),
    back: pages !== null && page > pages ? pages : page - 1,
    nextCursor: cursors?.next ?? null,
    backCursor: cursors?.previous ?? null,
    sizes: given.includes(size)
      ? given
      : [...given, size].sort((a, b) => a - b),
  };
}
