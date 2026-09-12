/**
 * Row records and the scopes their cells observe. A row's identity comes
 * from its record, never from its position in the current array: paging,
 * sorting and windowing all move records between positions.
 */

import type { ReadonlyChannel } from "../observable/createChannel.js";

/**
 * The default row shape: a plain record keyed by field name. Rows are
 * only constrained to `object`, so a consumer's own `interface` is a legal
 * row type without an index signature.
 */
export type RowRecord = Readonly<Record<string, unknown>>;

/** Extracts one record's stable identity. */
export type RowIdentifier<TRow extends object> = (row: TRow) => string;

/** One row of the model: a stable identity and the record it identifies. */
export type RowEntry<TRow extends object> = {
  readonly id: string;
  readonly record: TRow;
};

/**
 * The ordered rows of one result, addressable by stable identity. Entries
 * are carried across rebuilds when their identity and record are unchanged,
 * so an unchanged row keeps its object.
 */
export type RowModel<TRow extends object> = {
  readonly entries: readonly RowEntry<TRow>[];
  readonly ids: readonly string[];
  /** The record for one identity, or undefined when the row is not modelled. */
  readonly byId: (id: string) => TRow | undefined;
};

/**
 * Whether a schema field applies to a row, by the field's type scoping.
 * Value and empty are the field's own states; this is the third.
 *
 * Seam for the cells unit: a not-applicable cell draws a dash with the
 * accessible text "not applicable", where an empty one still draws nothing.
 */
export type Applicability = "applies" | "not-applicable";

/**
 * What one model build produced. Building never throws: rows the table
 * could not key reject the completion they arrived in, which the provider
 * publishes as a failure, so the rows already displayed stay — reporting
 * `refreshFailed`, or `stale` once the query has moved on — rather than being
 * replaced by rows nothing can address.
 */
export type RowModelResult<TRow extends object> =
  | { readonly status: "built"; readonly model: RowModel<TRow> }
  | { readonly status: "rejected"; readonly reason: string };

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
   * once, here, so every binding reports the same position. Forward seam:
   * the rows of a collapsed group are not displayed, so they take none.
   */
  readonly index: number;
  /**
   * The entry id of the group the entry belongs to, or null at the top
   * level. Forward seam: every entry is top-level until grouping lands, and
   * an entry's owning group is read from here, never recomputed.
   */
  readonly parent: string | null;
};

/**
 * One entry of a table body, in display order: a record's row, or a status
 * row carrying a status of the renderer's own shape.
 *
 * Forward seam: a group's header row joins this union as `"group"`, with
 * its group path and nesting level, spanning every track at a height of
 * its own.
 */
export type DisplayEntry<TStatus = unknown> =
  | (DisplayEntryBase & {
      readonly kind: "record";
      /** The identity of the row the entry displays. */
      readonly rowId: string;
    })
  | (DisplayEntryBase & {
      readonly kind: "status";
      /**
       * Why there are no rows, or why the rows after it are an earlier
       * query's. Forward seam: the table's own status is the only one
       * today; a group still loading is another entry of this kind, whose
       * parent is that group.
       */
      readonly status: TStatus;
    });

/** The kinds of display entry. */
export type DisplayEntryKind = DisplayEntry["kind"];

/**
 * One row's observation scope. Minted once per row identity and shared by
 * every cell of that row: field channels notify only the cells whose value
 * actually changed. A projection, so every channel on it is read-only —
 * the registry that mints it is the only publisher.
 */
export type RowScope<TRow extends object> = {
  readonly id: string;
  /** The whole record. Watching it is broader than watching one field. */
  readonly row: ReadonlyChannel<TRow>;
  /** One channel per observed field name. */
  readonly fields: Readonly<Record<string, ReadonlyChannel<unknown>>>;
  /** This row's membership of the collection's selection. */
  readonly selected: ReadonlyChannel<boolean>;
};
