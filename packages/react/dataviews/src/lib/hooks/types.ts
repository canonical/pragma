/**
 * Hook domain types for the hooks every part shares: the value hook that
 * observes one channel and the cell hook a column's own renderer reads.
 * Each hook declares its result type here.
 */

import type { ReadonlyChannel, RowRecord } from "@canonical/dataviews-core";

/** What `useDataViewsValue` returns: the channel's current value. */
export type UseDataViewsValueResult<T> = T;

/**
 * The cell scope returned by useDataViewsCell. Its channels are read-only.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type UseDataViewsCellResult<TRow extends object = RowRecord> = {
  /** The identity of the row the cell displays. */
  readonly rowId: string;
  /** The id of the column the cell renders. */
  readonly columnId: string;
  /** The whole record; watching it is broader than watching one field. */
  readonly record: ReadonlyChannel<TRow>;
  /** One channel per field the table observes, keyed by field name. */
  readonly fields: Readonly<Record<string, ReadonlyChannel<unknown>>>;
  /** Whether the row is in the collection's selection. */
  readonly selected: ReadonlyChannel<boolean>;
};
