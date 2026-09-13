/**
 * What a table body displays and what a pagination bar shows, decided
 * once from the collection's published state so that every framework
 * binding renders the same answer: the table's status, the entries of the
 * body in display order, and the pagination facts a bar offers.
 */

import type { Count } from "../result/index.js";

/**
 * What the table says in place of its rows, or above them, at the table's
 * scope. The no-rows cases stay distinct: an unfiltered collection with
 * nothing in it is not a query that matched nothing, and neither is a
 * failure. `pending` covers a collection nothing displayable has arrived
 * for yet, requested or not. `stale` stands above rows kept from an
 * earlier query, because the current one failed for `reason`;
 * `refresh-failed` above rows that still answer the current query, whose
 * refresh failed — without it the failure would show nothing at all.
 *
 * An open union: `DISPLAY_STATUS_PHASES` is keyed by its statuses, so one
 * added here is a compile error until every reader knows it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DisplayStatus =
  | { readonly status: "pending" }
  /**
   * Rows withheld while a grouping is applied, changed or cleared: the one
   * change of shape there is. No state produces it yet.
   *
   * @seam grouping — read by the grouping renderer, which withholds the
   * rows behind it and reveals them under `stale` should the request fail
   */
  | { readonly status: "regrouping" }
  | { readonly status: "failed"; readonly reason: string }
  | { readonly status: "refresh-failed"; readonly reason: string }
  | { readonly status: "stale"; readonly reason: string }
  | { readonly status: "no-data" }
  | { readonly status: "no-results" };

/**
 * Whether a status is a settled outcome or a passing state. A terminal
 * status is announced once, politely, from its own scope: nothing on
 * screen moves when rows are kept, so nothing else would say so. A
 * transient status is silent; what arrives after it speaks for itself.
 */
export type DisplayStatusPhase = "terminal" | "transient";

/** What every display entry carries, whatever its kind. */
type DisplayEntryBase = {
  /**
   * Unique across kinds and stable across rebuilds. Rendered rows,
   * measurements and retained focus are keyed by it, never by position, so
   * removing one entry moves nothing that belongs to another.
   */
  readonly id: string;
  /**
   * The entry's logical row position, as `aria-rowindex` reports it: the
   * header row is 1 and the entries follow in display order. Worked out
   * once, here, so every binding reports the same position.
   *
   * @seam grouping — read by the group header row; the rows of a collapsed
   * group are not displayed, so they take no position
   */
  readonly index: number;
  /**
   * The entry id of the group the entry belongs to, or null at the top
   * level. Every entry is top-level until grouping lands.
   *
   * @seam grouping — read by the group header row, so an entry's owning
   * group is read from here and never recomputed
   */
  readonly parent: string | null;
};

/**
 * One entry of a table body, in display order: a record's row, or a status
 * row. An open union: the virtual range's estimates are keyed by its kinds,
 * so a kind added here is a compile error until every reader knows it.
 *
 * @seam grouping — read by the group header row, which joins this union
 * as `"group"` with its path and nesting level
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DisplayEntry =
  | (DisplayEntryBase & {
      readonly kind: "record";
      /** The identity of the row the entry displays. */
      readonly rowId: string;
    })
  | (DisplayEntryBase & {
      readonly kind: "status";
      /**
       * Why there are no rows, or what stands over the rows after it. The
       * table's own status is the only one today.
       *
       * @seam grouping — read by the group header row: a group still
       * pending is another entry of this kind, whose parent is that group
       */
      readonly status: DisplayStatus;
    });

/**
 * The kinds of display entry.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DisplayEntryKind = DisplayEntry["kind"];

/**
 * What one table body displays.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DisplayEntriesConfig = {
  /** The modelled rows, in result order. */
  readonly rowIds: readonly string[];
  /** The table's status, or null when the rows speak for themselves. */
  readonly status: DisplayStatus | null;
};

/**
 * What a pagination bar shows and offers for one published state.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DisplayPagination = {
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
   * How many rows the window pages over, with how exactly the source
   * counts them for this query and page size: exact, a lower bound, or
   * unknown — also unknown while the rows on screen were counted for another
   * query or size. The count outlives a page move: the rows of another page
   * are still counted by it.
   */
  readonly total: Count;
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
