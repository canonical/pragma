import { areListsEqual } from "@canonical/dataviews-core/bindings";
import type { DisplayField } from "../common/index.js";

/**
 * Whether two field lists show the same fields the same way: the same
 * identities, the same record fields, and the same heading and content for
 * each. `header` and `cell` are compared by reference — one is a node and
 * the other a component, and neither has content this could compare.
 */
export default function areDisplayFieldsEqual(
  a: readonly DisplayField[],
  b: readonly DisplayField[],
): boolean {
  return areListsEqual(
    a,
    b,
    (field, other) =>
      field.id === other.id &&
      field.field === other.field &&
      field.header === other.header &&
      field.cell === other.cell,
  );
}
