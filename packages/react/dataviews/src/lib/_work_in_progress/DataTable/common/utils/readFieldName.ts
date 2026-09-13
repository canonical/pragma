import type { DataTableColumn } from "../../types.js";

/** The field one column reads: its own, or its id when it names none. */
export default function readFieldName(column: DataTableColumn): string {
  return column.field ?? column.id;
}
