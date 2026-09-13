import areListsEqual from "./areListsEqual.js";
import areSortsEqual from "./areSortsEqual.js";
import canonicalizeSlice from "./canonicalizeSlice.js";
import rankOperand from "./rankOperand.js";
import type { Predicate, Slice } from "./types.js";

/**
 * Operands are equal when their rank strings match, keeping slice equality
 * exactly consistent with request fingerprints (NaN equals NaN; the string
 * "0" never equals the number 0).
 */
const operandEquals = (
  a: Slice["filter"][number]["operands"][number],
  b: Slice["filter"][number]["operands"][number],
): boolean => rankOperand(a) === rankOperand(b);

const predicateEquals = (a: Predicate, b: Predicate): boolean =>
  a.field === b.field &&
  a.operator === b.operator &&
  areListsEqual(a.operands, b.operands, operandEquals);

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
    areListsEqual(left.filter, right.filter, predicateEquals) &&
    areSortsEqual(left.sort, right.sort)
  );
}
