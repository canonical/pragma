import type {
  DisplayEntriesConfig,
  DisplayEntry,
  DisplayStatus,
} from "./types.js";

/** The table's header row is logical row 1; its entries follow it. */
const headerRows = 1;

/**
 * Whether the rows stand under a status. Rows are kept under a status that
 * speaks about them — an earlier query's rows under `stale`, rows whose
 * refresh failed under `refresh-failed` — and withheld behind every other:
 * a status that says nothing is displayable replaces them.
 */
const keepsRows = (status: DisplayStatus | null): boolean =>
  status === null ||
  status.status === "stale" ||
  status.status === "refresh-failed";

/**
 * The entries of one table body, in display order: the table's status row
 * when it has one, then a row per record unless the status replaces them.
 *
 * Each entry's id is unique across kinds — a record's is prefixed, so no
 * row identity can collide with the status row's — and each carries its
 * logical row position. A renderer keys, measures and indexes rows by these
 * entries rather than by array position.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function listDisplayEntries({
  rowIds,
  status,
}: DisplayEntriesConfig): readonly DisplayEntry[] {
  const entries: DisplayEntry[] = [];
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
  if (keepsRows(status)) {
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
  }
  return Object.freeze(entries);
}
