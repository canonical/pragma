import type { StoryPackSearch } from "./types.js";

/**
 * Apply a pack list's free-text search to resolved rows.
 *
 * Search is a row predicate on projected SELECT variables — like filters,
 * it runs AFTER the author query, so user input never touches the query
 * text (injection-safe by construction) and the author's ORDER BY is
 * preserved.
 *
 * Matching semantics:
 * - The term is NFC-normalized and matched case-insensitively.
 * - A row passes when ANY declared variable's value contains the term as
 *   a substring; unbound variables (e.g. from OPTIONAL) never match.
 * - A non-string or empty term is a no-op — search is a refinement, not a
 *   validated enum, so there is nothing to reject against.
 *
 * @param rows - Rows produced by the pack's list query (post-filter).
 * @param search - The declared search (absent means no searching).
 * @param params - Story parameters as provided by the surface.
 * @returns Rows containing the term in at least one searched variable.
 */
export default function applyPackSearch(
  rows: Record<string, string>[],
  search: StoryPackSearch | undefined,
  params: Record<string, unknown>,
): Record<string, string>[] {
  const provided = params.search;
  if (search === undefined || typeof provided !== "string") {
    return rows;
  }
  const term = provided.trim().normalize("NFC").toLowerCase();
  if (term === "") {
    return rows;
  }
  return rows.filter((row) =>
    search.variables.some((variable) =>
      row[variable]?.normalize("NFC").toLowerCase().includes(term),
    ),
  );
}
