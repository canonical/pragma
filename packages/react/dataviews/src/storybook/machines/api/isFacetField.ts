import { FACET_FIELDS } from "./constants.js";
import type { ApiFacetField } from "./types.js";

/** Whether a field is one either endpoint computes a facet for. */
export default function isFacetField(field: unknown): field is ApiFacetField {
  return FACET_FIELDS.some((facetField) => facetField === field);
}
