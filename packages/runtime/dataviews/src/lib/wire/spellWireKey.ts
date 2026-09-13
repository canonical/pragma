import type { PredicateOperator } from "../query/index.js";
import { OPERATOR_DELIMITER } from "./constants.js";

/** The wire key one predicate address is written as: `eq` is the bare field name. */
export default function spellWireKey(
  field: string,
  operator: PredicateOperator,
): string {
  return operator === "eq" ? field : `${field}${OPERATOR_DELIMITER}${operator}`;
}
