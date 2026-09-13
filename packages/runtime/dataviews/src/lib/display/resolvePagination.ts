import type { DataViewsState } from "../coordinator/index.js";
import { areSlicesEqual } from "../query/index.js";
import { type Count, UNKNOWN_COUNT } from "../result/index.js";
import type { PaginationCapabilities } from "../source/index.js";
import type { DisplayPagination } from "./types.js";

/** Count the pages a number of rows makes, at least one: an empty collection has a page. */
const countPages = (total: number, size: number): number =>
  Math.max(1, Math.ceil(total / size));

/**
 * What a pagination bar shows and offers for one published state, given how
 * the source addresses its pages and the page sizes the bar offers.
 *
 * The destinations are the ones the collection can actually reach. A source
 * that publishes an exact pageable count gets a last page; one that
 * publishes no count gets a Next offered only while the page is full, and no
 * invented last page. A count belongs to the query and page size that
 * produced it, not to the page: it holds while another page of the same
 * query loads, so the page select never cuts its own list short, and it
 * goes when the query or the size moves. Rows from an older query prove
 * nothing about the current one.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function resolvePagination(
  state: DataViewsState<object>,
  pagination: PaginationCapabilities,
  sizes: readonly number[],
): DisplayPagination {
  const { page, size } = state.window;
  const { provenance, rows } = state.result;
  const current = state.resultMatchesQuery;
  // The pageable count outlives a page move: what it counts is the rows the
  // query and page size page over, which another page of them still are.
  const counted =
    provenance !== null &&
    provenance.window.size === size &&
    (provenance.slice === state.slice ||
      areSlicesEqual(provenance.slice, state.slice));
  // A page is addressable by number unless the source says it reaches its
  // pages only through the tokens an adjacent page hands back.
  const byNumber = pagination.kind === "offset";
  const total: Count =
    counted && state.result.counts !== null
      ? state.result.counts.pageable
      : UNKNOWN_COUNT;
  // A count is still worth showing where no page can be jumped to; a page
  // total is not, because it would name destinations nothing reaches.
  const pages =
    total.kind === "exact" && byNumber ? countPages(total.value, size) : null;
  // Only where pages are reached by token: an offset source may hand
  // cursors back, and sending one back to it is a page it refuses.
  const cursors = current && !byNumber ? state.result.cursors : null;
  const more = current ? state.result.more : null;
  const pageIsFull = current && rows !== null && rows.length === size;
  const offered = [...new Set(sizes)];
  // Whether a later page exists, by the strongest authority that answers:
  // the page total; where pages are reached by number, a lower bound past
  // this page — short of it, it proves nothing, and on a cursor source the
  // token has the last word, since a page the bound promises is still
  // unreachable without one; the token; the source's word; a full page.
  let hasNext: boolean;
  if (pages !== null) {
    hasNext = page < pages;
  } else if (
    byNumber &&
    total.kind === "at-least" &&
    page < countPages(total.value, size)
  ) {
    hasNext = true;
  } else if (cursors !== null) {
    hasNext = cursors.next !== null;
  } else {
    hasNext = more ?? pageIsFull;
  }
  return {
    page,
    size,
    shown: current && rows !== null ? rows.length : null,
    total,
    pages,
    hasNext,
    back: pages !== null && page > pages ? pages : page - 1,
    nextCursor: cursors?.next ?? null,
    backCursor: cursors?.previous ?? null,
    sizes: offered.includes(size)
      ? offered
      : [...offered, size].sort((a, b) => a - b),
  };
}
