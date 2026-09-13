import {
  areListsEqual,
  areSizingsEqual,
} from "@canonical/dataviews-core/bindings";
import { readFieldName, readSizing } from "./common/utils/index.js";
import type { DataTableColumn } from "./types.js";

/**
 * Whether two column arrays say the same thing about the model everything
 * below the rendered tree is derived from: the layout's declared tracks,
 * the observed field names, the solved geometry and one row scope per
 * identity. A caller writing its columns as a literal rebuilds the array
 * on every render, and re-minting the layout would drop every
 * user-resized width, so the table keys on this reading of the content.
 */
export default function areColumnModelsEqual(
  a: readonly DataTableColumn[],
  b: readonly DataTableColumn[],
): boolean {
  return areListsEqual(
    a,
    b,
    (column, other) =>
      column.id === other.id &&
      readFieldName(column) === readFieldName(other) &&
      areSizingsEqual(readSizing(column), readSizing(other)),
  );
}
