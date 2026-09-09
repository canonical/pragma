import canonicalSlice, { operandRankOf } from "./canonicalSlice.js";
import type { Slice } from "./types.js";

/**
 * Operands are equal when their rank strings match, keeping slice equality
 * exactly consistent with request fingerprints (NaN equals NaN; the string
 * "0" never equals the number 0).
 */
const operandEquals = (
  a: Slice["filter"][number]["operands"][number],
  b: Slice["filter"][number]["operands"][number],
): boolean => operandRankOf(a) === operandRankOf(b);

const predicatesEqual = (a: Slice["filter"], b: Slice["filter"]): boolean =>
  a.length === b.length &&
  a.every((predicate, index) => {
    const other = b[index];
    return (
      predicate.field === other.field &&
      predicate.operator === other.operator &&
      predicate.operands.length === other.operands.length &&
      predicate.operands.every((operand, operandIndex) =>
        operandEquals(operand, other.operands[operandIndex]),
      )
    );
  });

const sortsEqual = (a: Slice["sort"], b: Slice["sort"]): boolean =>
  a.length === b.length &&
  a.every(
    (term, index) =>
      term.field === b[index].field && term.direction === b[index].direction,
  );

/**
 * Semantic slice equality: two slices are equal when their canonical forms
 * match. Equality operand order does not matter; sort order always does.
 */
export default function sliceEquals(a: Slice, b: Slice): boolean {
  const left = canonicalSlice(a);
  const right = canonicalSlice(b);
  return (
    left.search === right.search &&
    left.group === right.group &&
    predicatesEqual(left.filter, right.filter) &&
    sortsEqual(left.sort, right.sort)
  );
}
