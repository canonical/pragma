/**
 * Row records and the scopes their cells observe. A row's identity comes
 * from its record, never from its position in the current array: paging,
 * sorting and windowing all move records between positions.
 */

import type { Channel } from "../observable/createChannel.js";

/**
 * The default row shape: an adapter record keyed by field name. Rows are
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
 * One row's observation scope. Minted once per row identity and shared by
 * every cell of that row: field channels notify only the cells whose value
 * actually changed.
 */
export type RowScope<TRow extends object> = {
  readonly id: string;
  /** The whole record. Watching it is broader than watching one field. */
  readonly row: Channel<TRow>;
  /** One channel per observed field name. */
  readonly fields: Readonly<Record<string, Channel<unknown>>>;
  /** This row's membership of the collection's selection. */
  readonly selected: Channel<boolean>;
};
