import type {
  CollectionState,
  SourceCapabilities,
} from "@canonical/dataviews-core";
import type { PaginationState } from "./types.js";

/**
 * Derive the bar's state from the provider's snapshot.
 *
 * The destinations are the ones the collection can actually reach. A source
 * that publishes a filtered total gets a last page; one that publishes no
 * count gets a Next offered only while the page is full, and no invented
 * last page. A total that belongs to an earlier query is not this one's.
 */
export default function derivePaginationState(
  snapshot: CollectionState<object>,
  sizes: readonly number[],
  pagination: SourceCapabilities["pagination"] | null = null,
): PaginationState {
  const { page, size } = snapshot.window;
  const current = snapshot.resultMatchesQuery;
  const rows = snapshot.result.rows;
  // A page is addressable by number unless the source says it reaches its
  // pages only through the tokens an adjacent page hands back.
  const byNumber = pagination === null || pagination.kind === "offset";
  // Only the rows the window pages over can say how many pages there are,
  // and only an exact count of them can.
  const pageable = snapshot.result.counts?.pageable;
  const total =
    current && pageable !== undefined && pageable.kind === "exact"
      ? pageable.value
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
