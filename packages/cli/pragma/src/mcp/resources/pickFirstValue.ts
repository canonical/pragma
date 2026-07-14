/**
 * Resolve the first available value from a predicate priority chain.
 *
 * Walks `orderedPredicates` in order and returns the first non-empty value
 * present in `valuesByPredicate`. This drives the label/description fallback:
 * a namespace's `PROPERTY_MAP` predicate is tried first, then the generic
 * chain (`rdfs:label`, `skos:prefLabel`, …), so foreign ontologies still
 * resolve a name.
 *
 * @param valuesByPredicate - Full predicate URI → asserted lexical values.
 * @param orderedPredicates - Predicate URIs in descending priority.
 * @returns The first non-empty value, or `null` when none match.
 */
export default function pickFirstValue(
  valuesByPredicate: ReadonlyMap<string, readonly string[]>,
  orderedPredicates: readonly string[],
): string | null {
  for (const predicate of orderedPredicates) {
    const values = valuesByPredicate.get(predicate);
    if (values === undefined) continue;
    for (const value of values) {
      if (value.length > 0) return value;
    }
  }
  return null;
}
