import { areListsEqual } from "@canonical/dataviews-core/bindings";
import areColumnModelsEqual from "./areColumnModelsEqual.js";
import type { DataTableColumn } from "./types.js";

/**
 * Whether two column arrays say the same thing about everything the
 * rendered tree reads, the model included. `header` and `cell` are
 * compared by reference: one is a node and the other a component, and
 * neither has content this could compare. A separate reading from the
 * model's, because an inline `header` node must not cost anyone a new
 * layout — only a re-render.
 */
export default function areColumnsEqual(
  a: readonly DataTableColumn[],
  b: readonly DataTableColumn[],
): boolean {
  return (
    areColumnModelsEqual(a, b) &&
    areListsEqual(
      a,
      b,
      (column, other) =>
        column.sortable === other.sortable &&
        column.resizable === other.resizable &&
        column.header === other.header &&
        column.cell === other.cell,
    )
  );
}
