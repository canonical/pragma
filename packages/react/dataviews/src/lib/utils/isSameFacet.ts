import type { Facet } from "@canonical/dataviews-core";
import { areFieldFacetsEqual } from "@canonical/dataviews-core/bindings";

/**
 * Whether one field's facet still claims what it claimed: the same values and
 * counts, or the same range ends. A facet the source has not answered (null)
 * and one it answered without (undefined) each claim the same as themselves
 * and nothing else.
 *
 * A source mints a fresh facet for every request, and the provider keeps the
 * whole record only while every field's facet is unchanged, so a chart that
 * held its own facet by identity alone would redraw whenever another field's
 * facet moved.
 */
export default function isSameFacet(
  a: Facet | null | undefined,
  b: Facet | null | undefined,
): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  return areFieldFacetsEqual(a, b);
}
