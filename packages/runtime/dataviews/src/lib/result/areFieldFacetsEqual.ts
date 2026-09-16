import { areListsEqual } from "../query/index.js";
import areCountsEqual from "./areCountsEqual.js";
import type { Facet } from "./types.js";

/** Whether two facets claim the same: one kind, and the same values and counts, or range ends. */
export default function areFieldFacetsEqual(a: Facet, b: Facet): boolean {
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
}
