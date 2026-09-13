import type {
  Collection,
  ReadonlyChannel,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { useContext, useMemo } from "react";
import CellContext from "../CellContext.js";
import type { UseDataViewsCellResult } from "./types.js";

/**
 * Read the current cell's scope, installed by the table renderer.
 *
 * The collection is the type and identity witness: it must be the one the
 * enclosing table's provider was built over, and the hook must run inside
 * a component returned by a column's `cell` — not in an arbitrary callback.
 * The record channel is then typed as the collection's records, with no
 * cast at the call site.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function useDataViewsCell<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(collection: Collection<TFields, TRow>): UseDataViewsCellResult<TRow> {
  const cell = useContext(CellContext);
  if (cell === null) {
    throw new Error(
      "useDataViewsCell must be used inside a cell rendered by a DataViews table",
    );
  }
  if (cell.collection !== collection) {
    throw new Error(
      "useDataViewsCell was passed a collection that is not the one the enclosing table's provider was built over",
    );
  }
  // Memoised on the value the table installed, which is itself stable for a
  // mounted cell, so a custom cell may memoise on what it is handed.
  return useMemo(
    () => ({
      rowId: cell.rowId,
      columnId: cell.columnId,
      // Checked above: the cell's rows are this collection's records.
      record: cell.record as ReadonlyChannel<TRow>,
      fields: cell.fields,
      selected: cell.selected,
    }),
    [cell],
  );
}
