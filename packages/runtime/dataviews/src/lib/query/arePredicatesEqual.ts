import areListsEqual from "./areListsEqual.js";
import rankOperand from "./rankOperand.js";
import type { Predicate, PredicateOperand } from "./types.js";

/**
 * Operands are equal when their rank strings match, keeping predicate
 * equality exactly consistent with request fingerprints (NaN equals NaN;
 * the string "0" never equals the number 0).
 */
const areOperandsEqual = (a: PredicateOperand, b: PredicateOperand): boolean =>
  rankOperand(a) === rankOperand(b);

/** An equality's operands are a set: the same members, in any order. */
const areOperandSetsEqual = (
  a: readonly PredicateOperand[],
  b: readonly PredicateOperand[],
): boolean => {
  const ranks = new Set(a.map(rankOperand));
  return (
    ranks.size === new Set(b.map(rankOperand)).size &&
    b.every((operand) => ranks.has(rankOperand(operand)))
  );
};

/**
 * Semantic predicate equality: the same address, and the same operands —
 * as a set for an equality, whose operand order never matters, and in
 * order for every other operator. Pure.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function arePredicatesEqual(
  a: Predicate,
  b: Predicate,
): boolean {
  return (
    a.field === b.field &&
    a.operator === b.operator &&
    (a.operator === "eq"
      ? areOperandSetsEqual(a.operands, b.operands)
      : areListsEqual(a.operands, b.operands, areOperandsEqual))
  );
}
