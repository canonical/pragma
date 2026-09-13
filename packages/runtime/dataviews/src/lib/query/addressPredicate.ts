import type { PredicateOperator } from "./types.js";

/** The stable address of a predicate: its field and operator pair. */
export default function addressPredicate(
  field: string,
  operator: PredicateOperator,
): string {
  return `${field}\u0000${operator}`;
}
