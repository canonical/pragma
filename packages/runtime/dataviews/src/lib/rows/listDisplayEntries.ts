import type { DisplayEntriesConfig, DisplayEntry } from "./types.js";

/** The table's header row is logical row 1; its entries follow it. */
const headerRows = 1;

/**
 * The entries of one table body, in display order: the table's status row
 * when it has one, then a row per record.
 *
 * Each entry's id is unique across kinds — a record's is prefixed, so no
 * row identity can collide with the status row's — and each carries its
 * logical row position. A renderer keys, measures and indexes rows by these
 * entries rather than by array position.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function listDisplayEntries<TStatus>({
  rowIds,
  status,
}: DisplayEntriesConfig<TStatus>): readonly DisplayEntry<TStatus>[] {
  const entries: DisplayEntry<TStatus>[] = [];
  if (status !== null) {
    entries.push(
      Object.freeze({
        kind: "status",
        id: "status",
        index: headerRows + 1,
        parent: null,
        status,
      }),
    );
  }
  for (const rowId of rowIds) {
    entries.push(
      Object.freeze({
        kind: "record",
        id: `record:${rowId}`,
        index: headerRows + entries.length + 1,
        parent: null,
        rowId,
      }),
    );
  }
  return Object.freeze(entries);
}
