import { arePredicatesEqual, type Predicate } from "../query/index.js";

/**
 * Two predicates the query cannot tell apart, either of which may be
 * absent: a record's own, kept as it built it, against the provider's
 * canonical copy of the same predicate. Pure.
 */
export default function isSamePredicate(
  a: Predicate | null,
  b: Predicate | null,
): boolean {
  return a === b || (a !== null && b !== null && arePredicatesEqual(a, b));
}
