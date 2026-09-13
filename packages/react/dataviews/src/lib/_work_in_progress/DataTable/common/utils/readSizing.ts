import type { ColumnSizing } from "@canonical/dataviews-core/bindings";
import { DEFAULT_SIZING } from "../../constants.js";
import type { DataTableColumn } from "../../types.js";

/** One column's declared sizing, defaulted. */
export default function readSizing(column: DataTableColumn): ColumnSizing {
  return column.sizing ?? DEFAULT_SIZING;
}
