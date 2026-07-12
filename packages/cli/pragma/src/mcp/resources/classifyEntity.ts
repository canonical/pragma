import { CLASS_TYPE_URIS, PROPERTY_TYPE_URIS } from "./constants.js";
import type { EntityBox, EntityCategory } from "./types.js";

/**
 * Classify a subject into its box and category from its `rdf:type` values.
 *
 * Schema constructs win over instance-hood: a subject typed as both a class
 * and something else is a class, so the schema is never buried among
 * individuals. A subject with any non-schema type is an individual; a subject
 * with no type at all returns `null` (the caller decides how to surface it).
 *
 * @param typeUris - Full `rdf:type` object URIs asserted for the subject.
 * @returns The box and category, or `null` when the subject has no type.
 */
export default function classifyEntity(
  typeUris: readonly string[],
): { box: EntityBox; category: EntityCategory } | null {
  const hasClassType = typeUris.some((t) => CLASS_TYPE_URIS.includes(t));
  if (hasClassType) return { box: "tbox", category: "class" };

  const hasPropertyType = typeUris.some((t) => PROPERTY_TYPE_URIS.includes(t));
  if (hasPropertyType) return { box: "tbox", category: "property" };

  if (typeUris.length > 0) return { box: "abox", category: "individual" };

  return null;
}
