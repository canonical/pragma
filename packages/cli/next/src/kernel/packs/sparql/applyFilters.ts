/**
 * Apply declared pack filters to resolved list rows.
 *
 * Filters are row predicates on projected SELECT variables — the author query is
 * never modified, so user input cannot inject SPARQL and the query's ordering is
 * preserved. With declared `values` the input is matched against the canonical
 * set (NFC, case-insensitive); without them the input is a free term matched on
 * case-insensitive equality. A row lacking the variable never matches. Several
 * filters combine conjunctively.
 */

import { PragmaError } from "../../error/PragmaError.js";
import type { PackFilter, PackRow } from "../types.js";

/**
 * @param rows - Rows produced by the pack's list query.
 * @param filters - Declared filters (absent means no filtering).
 * @param params - Story parameters as provided by the surface.
 * @returns Rows matching every provided filter.
 * @throws PragmaError INVALID_INPUT when a value is not in a filter's declared
 *   set, or when a value-free filter receives a non-string value.
 */
export function applyPackFilters(
  rows: PackRow[],
  filters: readonly PackFilter[] | undefined,
  params: Record<string, unknown>,
): PackRow[] {
  let result = rows;
  for (const filter of filters ?? []) {
    const provided = params[filter.param];
    if (provided === undefined) continue;
    const values = filter.values;
    if (values === undefined) {
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

/** @throws PragmaError INVALID_INPUT when a value-free filter value is not a string. */
function requireStringValue(provided: unknown, filter: PackFilter): string {
  if (typeof provided !== "string") {
    throw PragmaError.invalidInput(filter.param, String(provided), {
      recovery: { message: `Provide a string value for --${filter.param}.` },
    });
  }
  return provided.trim().normalize("NFC");
}

/** @throws PragmaError INVALID_INPUT when the value is not in the declared set. */
function canonicalizeFilterValue(
  provided: unknown,
  filter: PackFilter,
  values: readonly string[],
): string {
  if (typeof provided === "string") {
    const normalized = provided.trim().normalize("NFC");
    const match = values.find(
      (value) =>
        value.normalize("NFC").toLowerCase() === normalized.toLowerCase(),
    );
    if (match !== undefined) return match.normalize("NFC");
  }
  throw PragmaError.invalidInput(filter.param, String(provided), {
    validOptions: [...values],
    recovery: {
      message: `Allowed values for --${filter.param}: ${values.join(", ")}.`,
    },
  });
}
