import type { SortTerm } from "@canonical/dataviews-core";

/** Whether two sort terms say the same thing: one field, one direction. */
export default function areSortTermsEqual(
  term: SortTerm,
  other: SortTerm,
): boolean {
  return term.field === other.field && term.direction === other.direction;
}
