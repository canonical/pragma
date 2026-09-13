import type { SortTerm } from "./types.js";

/**
 * Collapse repeated fields to their first occurrence, keeping precedence
 * otherwise. A field appears once in an ordering: a later term over the same
 * field can only restate or contradict the first, and neither changes which
 * rows come out, so one effective ordering keeps one request identity.
 *
 * @experimental Newly public so every layer collapses the same way; a
 * grouping level may later collapse against it too.
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
