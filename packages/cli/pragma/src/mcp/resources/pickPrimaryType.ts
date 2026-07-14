import { NON_GROUPING_TYPE_URIS } from "./constants.js";

/**
 * Choose an individual's primary type — its grouping key and `instanceOf`
 * pointer — from its full `rdf:type` object URIs.
 *
 * Schema and top/individual meta-types (`owl:Class`, `owl:NamedIndividual`,
 * `owl:Thing`, `rdf:Property`, …) are filtered out first, so a subject typed
 * `[ds:Component, owl:NamedIndividual]` resolves to `ds:Component` rather than
 * the meta-type that happens to sort first. Among the remaining meaningful
 * types the lexicographically-first is chosen for determinism. When an entity
 * has nothing but meta-types, the full set is the fallback pool so a type is
 * still returned.
 *
 * @param fullTypes - The subject's full `rdf:type` object URIs.
 * @returns The chosen full type URI, or `null` when there are no types.
 */
export default function pickPrimaryType(
  fullTypes: readonly string[],
): string | null {
  const meaningful = fullTypes.filter(
    (type) => !NON_GROUPING_TYPE_URIS.includes(type),
  );
  const pool = meaningful.length > 0 ? meaningful : fullTypes;
  return [...pool].sort((a, b) => a.localeCompare(b)).at(0) ?? null;
}
