import type { Slice } from "./types.js";

/**
 * Whether two orderings agree term for term, precedence included.
 *
 * One comparison for the location binding and for slice equality, so both
 * read an ordering the same way.
 */
export default function areSortsEqual(
  a: Slice["sort"],
  b: Slice["sort"],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (term, index) =>
        term.field === b.at(index)?.field &&
        term.direction === b.at(index)?.direction,
    )
  );
}
