import { PragmaError } from "#error";
import type { StoryPackFilter } from "./types.js";

/**
 * Apply declared pack filters to resolved list rows.
 *
 * Filters are row predicates on projected SELECT variables — the author
 * query is never modified, so user input cannot inject SPARQL and the
 * query's ordering is preserved.
 *
 * Matching semantics:
 * - Input is trimmed, unicode-normalized (NFC), and matched against the
 *   declared values case-insensitively; the DECLARED value is canonical
 *   and is what rows are compared against.
 * - Row comparison is exact on the canonical value (NFC on both sides).
 *   ke bindings carry lexical forms — language tags and datatypes are
 *   already stripped — so plain equality is sound.
 * - A row without a binding for the variable (e.g. from OPTIONAL) never
 *   matches an active filter.
 * - Several provided filters combine conjunctively.
 *
 * @param rows - Rows produced by the pack's list query.
 * @param filters - Declared filters (absent means no filtering).
 * @param params - Story parameters as provided by the surface.
 * @returns Rows matching every provided filter.
 * @throws PragmaError with code `INVALID_INPUT` (carrying the declared
 *         values as valid options) when a provided value is not in the
 *         filter's declared set.
 */
export default function applyPackFilters(
  rows: Record<string, string>[],
  filters: readonly StoryPackFilter[] | undefined,
  params: Record<string, unknown>,
): Record<string, string>[] {
  // Start from the caller's array; each active filter's `.filter()` yields a
  // fresh array, so with no active filter the rows pass through unmodified —
  // no defensive clone (the caller owns the query result).
  let result = rows;
  for (const filter of filters ?? []) {
    const provided = params[filter.param];
    if (provided === undefined) continue;
    const canonical = canonicalizeFilterValue(provided, filter);
    result = result.filter(
      (row) => row[filter.variable]?.normalize("NFC") === canonical,
    );
  }
  return result;
}

/**
 * Resolve a provided filter value to its declared canonical form.
 *
 * @throws PragmaError with code `INVALID_INPUT` when the value is not a
 *         string or not in the declared set.
 */
function canonicalizeFilterValue(
  provided: unknown,
  filter: StoryPackFilter,
): string {
  if (typeof provided === "string") {
    const normalized = provided.trim().normalize("NFC");
    const match = filter.values.find(
      (value) =>
        value.normalize("NFC").toLowerCase() === normalized.toLowerCase(),
    );
    if (match !== undefined) {
      return match.normalize("NFC");
    }
  }
  throw PragmaError.invalidInput(filter.param, String(provided), {
    validOptions: [...filter.values],
    recovery: {
      message: `Allowed values for --${filter.param}: ${filter.values.join(", ")}.`,
    },
  });
}
