/**
 * Apply declared pack filters to resolved list rows.
 *
 * Filters are row predicates on projected SELECT variables — the author query is
 * never modified, so user input cannot inject SPARQL and the query's ordering is
 * preserved. With declared `values` the input is canonicalized against the set
 * (NFC, case-insensitive) and rows are matched case-insensitively; without them
 * the input is a free term matched the same way. A row lacking the variable never
 * matches. Several filters combine conjunctively; several values for one
 * filter (a repeated flag) combine as a union.
 *
 * A filter declaring `match: "set"` reads its cell as a space-separated SET and
 * matches any member — the shape a query produces for a dimension a row belongs
 * to several values of at once (a category and its ancestors, say). The
 * comparison is otherwise identical, so exactly one code path decides what a
 * match is.
 */

import { PragmaError } from "../../error/index.js";
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
    // A repeated CLI flag accumulates into an array; MCP args stay scalar.
    // Several values for ONE filter are a union (a row matches any of them);
    // several filters still combine conjunctively.
    const occurrences = Array.isArray(provided) ? provided : [provided];
    if (occurrences.length === 0) continue;
    const values = filter.values;
    const terms = occurrences.map((occurrence) =>
      values === undefined
        ? requireStringValue(occurrence, filter).toLowerCase()
        : canonicalizeFilterValue(occurrence, filter, values).toLowerCase(),
    );
    result = result.filter((row) =>
      cellValues(row, filter).some((value) => terms.includes(value)),
    );
  }
  return result;
}

/**
 * The comparable values a row offers for one filter, lowercased.
 *
 * One value for an ordinary filter; every space-separated member for a `"set"`
 * one. A row lacking the variable offers none, so it never matches.
 */
function cellValues(row: PackRow, filter: PackFilter): string[] {
  const cell = row[filter.variable];
  if (cell === undefined) return [];
  const normalized = cell.normalize("NFC").toLowerCase();
  if (filter.match !== "set") return [normalized];
  return normalized.split(/\s+/).filter((value) => value !== "");
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
