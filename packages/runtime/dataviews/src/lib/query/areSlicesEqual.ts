import areListsEqual from "./areListsEqual.js";
import arePredicatesEqual from "./arePredicatesEqual.js";
import areSortsEqual from "./areSortsEqual.js";
import canonicalizeSlice from "./canonicalizeSlice.js";
import type { Slice } from "./types.js";

const groupsEqual = (a: Slice["group"], b: Slice["group"]): boolean =>
  areListsEqual(a, b, (left, right) => left.field === right.field);

/**
 * Semantic slice equality: two slices are equal when their canonical forms
 * match. Equality operand order does not matter; sort order always does.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function areSlicesEqual(a: Slice, b: Slice): boolean {
  const left = canonicalizeSlice(a);
  const right = canonicalizeSlice(b);
  return (
    left.search === right.search &&
    groupsEqual(left.group, right.group) &&
    areListsEqual(left.filter, right.filter, arePredicatesEqual) &&
    areSortsEqual(left.sort, right.sort)
  );
}
