import { OPERATOR_ARITY } from "./constants.js";
import type { PredicateOperator } from "./types.js";

/**
 * Why a count of operands is not one the operator carries, or null when it
 * is: `eq` needs at least one, `gte` and `lte` exactly one, `isSet` none.
 */
export default function rejectOperandArity(
  operator: PredicateOperator,
  count: number,
): string | null {
  switch (OPERATOR_ARITY[operator]) {
    case "many":
      return count > 0
        ? null
        : `${operator} predicate needs at least one operand`;
    case "one":
      return count === 1
        ? null
        : `${operator} predicate needs exactly one operand`;
    case "none":
      return count === 0 ? null : `${operator} predicate takes no operands`;
  }
}
