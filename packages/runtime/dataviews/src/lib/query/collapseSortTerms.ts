import type { SortTerm } from "./types.js";

/**
 * Collapse repeated fields to their first occurrence, keeping precedence
 * otherwise. A field appears once in an ordering: a later term over the same
 * field can only restate or contradict the first, and neither changes which
 * rows come out, so one effective ordering keeps one request identity.
 *
 * One collapse for every layer, so canonicalization, a command and a
 * decode agree on the ordering a repeated field spells.
 */
export default function collapseSortTerms(
  terms: readonly SortTerm[],
): readonly SortTerm[] {
  const seen = new Set<string>();
  const collapsed: SortTerm[] = [];
  for (const term of terms) {
    if (seen.has(term.field)) {
      continue;
    }
    seen.add(term.field);
    collapsed.push({ field: term.field, direction: term.direction });
  }
  return collapsed;
}
