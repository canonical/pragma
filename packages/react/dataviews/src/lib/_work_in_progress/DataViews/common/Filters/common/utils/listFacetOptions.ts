import type { Facet } from "@canonical/dataviews-core";

/**
 * The options a facet lists for a field whose options are the server's, each
 * once as its text — the operand such a field takes, and how the wire spells
 * it, so 42 and "42" are one option — in the facet's order, less the empty
 * text, which names no checkbox and reads back from the wire as no
 * restriction. A facet of another kind, or none, lists nothing.
 */
export default function listFacetOptions(
  facet: Facet | undefined,
): readonly string[] {
  if (facet?.kind !== "values") {
    return [];
  }
  const listed = new Set<string>();
  for (const { value } of facet.values) {
    const text = String(value);
    if (value !== true && text !== "") {
      listed.add(text);
    }
  }
  return [...listed];
}
