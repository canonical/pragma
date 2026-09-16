import { areListsEqual } from "../query/index.js";
import areFieldFacetsEqual from "./areFieldFacetsEqual.js";
import type { Facet } from "./types.js";

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
