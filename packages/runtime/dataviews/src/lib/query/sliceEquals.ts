import areSortsEqual from "./areSortsEqual.js";
import canonicalSlice, { operandRankOf } from "./canonicalSlice.js";
import type { Predicate, Slice } from "./types.js";

/**
 * Operands are equal when their rank strings match, keeping slice equality
 * exactly consistent with request fingerprints (NaN equals NaN; the string
 * "0" never equals the number 0).
 */
const operandEquals = (
  a: Slice["filter"][number]["operands"][number],
  b: Slice["filter"][number]["operands"][number],
): boolean => operandRankOf(a) === operandRankOf(b);

/**
 * Whether two lists are equal element by element. The lengths are compared
 * first, so the parallel read is in range and asserted in place rather
 * than handled: an undefined there is not a case, it is a broken length.
 */
const listsEqual = <T>(
  a: readonly T[],
  b: readonly T[],
  equals: (left: T, right: T) => boolean,
): boolean =>
  a.length === b.length &&
  a.every((left, index) => equals(left, b[index] as T));

const predicateEquals = (a: Predicate, b: Predicate): boolean =>
  a.field === b.field &&
  a.operator === b.operator &&
  listsEqual(a.operands, b.operands, operandEquals);

const groupsEqual = (a: Slice["group"], b: Slice["group"]): boolean =>
  listsEqual(a, b, (left, right) => left.field === right.field);

/**
 * Semantic slice equality: two slices are equal when their canonical forms
 * match. Equality operand order does not matter; sort order always does.
 */
export default function sliceEquals(a: Slice, b: Slice): boolean {
  const left = canonicalSlice(a);
  const right = canonicalSlice(b);
  return (
    left.search === right.search &&
    groupsEqual(left.group, right.group) &&
    listsEqual(left.filter, right.filter, predicateEquals) &&
    areSortsEqual(left.sort, right.sort)
  );
}
