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
 * - With declared `values`: input is trimmed, unicode-normalized (NFC),
 *   and matched against the declared values case-insensitively; the
 *   DECLARED value is canonical and rows are compared against it exactly
 *   (NFC on both sides).
 * - Without `values` (value-free filter): the input itself is the term —
 *   trimmed, NFC-normalized — and rows match on case-insensitive equality
 *   with the variable's value. Nothing is rejected up front because the
 *   valid set lives in the data.
 * - ke bindings carry lexical forms — language tags and datatypes are
 *   already stripped — so plain string comparison is sound.
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
 *         filter's declared set, or when a value-free filter receives a
 *         non-string value.
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
    const values = filter.values;
    if (values === undefined) {
      // Value-free filter: case-insensitive equality against the variable.
      const term = requireStringValue(provided, filter).toLowerCase();
      result = result.filter(
        (row) => row[filter.variable]?.normalize("NFC").toLowerCase() === term,
      );
      continue;
    }
    const canonical = canonicalizeFilterValue(provided, filter, values);
    result = result.filter(
      (row) => row[filter.variable]?.normalize("NFC") === canonical,
    );
  }
  return result;
}

/**
 * Require a value-free filter's input to be a trimmed, NFC-normalized
 * string.
 *
 * @throws PragmaError with code `INVALID_INPUT` when it is not a string.
 */
function requireStringValue(
  provided: unknown,
  filter: StoryPackFilter,
): string {
  if (typeof provided !== "string") {
    throw PragmaError.invalidInput(filter.param, String(provided), {
      recovery: {
        message: `Provide a string value for --${filter.param}.`,
      },
    });
  }
  return provided.trim().normalize("NFC");
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
  values: readonly string[],
): string {
  if (typeof provided === "string") {
    const normalized = provided.trim().normalize("NFC");
    const match = values.find(
      (value) =>
        value.normalize("NFC").toLowerCase() === normalized.toLowerCase(),
    );
    if (match !== undefined) {
      return match.normalize("NFC");
    }
  }
  throw PragmaError.invalidInput(filter.param, String(provided), {
    validOptions: [...values],
    recovery: {
      message: `Allowed values for --${filter.param}: ${values.join(", ")}.`,
    },
  });
}
