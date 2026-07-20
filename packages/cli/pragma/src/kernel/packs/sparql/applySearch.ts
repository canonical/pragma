/**
 * Apply a pack list's free-text search to resolved rows.
 *
 * Like filters, search runs AFTER the author query, so user input never touches
 * the query text (injection-safe) and the author's ORDER BY is preserved. The
 * term is NFC-normalized and matched case-insensitively; a row passes when ANY
 * declared variable contains it as a substring. A non-string or empty term is a
 * no-op.
 */

import type { PackRow, PackSearch } from "../types.js";

/**
 * @param rows - Rows produced by the pack's list query (post-filter).
 * @param search - The declared search (absent means no searching).
 * @param params - Story parameters as provided by the surface.
 * @returns Rows containing the term in at least one searched variable.
 */
export function applyPackSearch(
  rows: PackRow[],
  search: PackSearch | undefined,
  params: Record<string, unknown>,
): PackRow[] {
  const provided = params.search;
  if (search === undefined || typeof provided !== "string") return rows;
  const term = provided.trim().normalize("NFC").toLowerCase();
  if (term === "") return rows;
  return rows.filter((row) =>
    search.variables.some((variable) =>
      row[variable]?.normalize("NFC").toLowerCase().includes(term),
    ),
  );
}
