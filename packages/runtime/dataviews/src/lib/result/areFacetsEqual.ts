import { areListsEqual } from "../query/index.js";
import areCountsEqual from "./areCountsEqual.js";
import type { Facet } from "./types.js";

/** Whether two facets claim the same: one kind, and the same values and counts, or range ends. */
const areFieldFacetsEqual = (a: Facet, b: Facet): boolean => {
  if (a.kind === "range" || b.kind === "range") {
    return (
      a.kind === "range" &&
      b.kind === "range" &&
      Object.is(a.min, b.min) &&
      Object.is(a.max, b.max)
    );
  }
  return areListsEqual(
    a.values,
    b.values,
    (left, right) =>
      Object.is(left.value, right.value) &&
      areCountsEqual(left.count, right.count),
  );
};

/**
 * Whether two sets of facets claim the same: the same fields, in order, each
 * the same facet. A page that left its facets out answered none, so it claims
 * what an empty set claims.
 */
export default function areFacetsEqual(
  a: Readonly<Record<string, Facet>>,
  b: Readonly<Record<string, Facet>> | undefined,
): boolean {
  const other = b ?? {};
  return (
    areListsEqual(Object.keys(a), Object.keys(other), Object.is) &&
    areListsEqual(Object.values(a), Object.values(other), areFieldFacetsEqual)
  );
}
