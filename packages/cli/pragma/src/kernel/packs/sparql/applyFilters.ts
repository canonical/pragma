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
 *
 * A value-free filter still REJECTS a value the data does not carry, with the
 * observed values as `validOptions` — the same courtesy a declared-`values`
 * filter has always extended, without copying the vocabulary into the consumer.
 * The vocabulary is read from the rows the graph just answered with, because the
 * graph IS the vocabulary; a story that hard-coded the slugs would go stale the
 * first time the data grew a category. Before this, a typo'd `--category`
 * returned `{"ok":true,"data":[],"meta":{}}` — indistinguishable, over MCP, from
 * a genuinely empty category.
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
    // Compared against the UNFILTERED rows: a value that exists but is excluded
    // by a conjunction is a legitimately empty answer, not a bad argument.
    if (values === undefined)
      rejectUnobserved(rows, filter, occurrences, terms);
    result = result.filter((row) =>
      cellValues(row, filter).some((value) =>
        terms.includes(value.toLowerCase()),
      ),
    );
  }
  return result;
}

/**
 * Reject a value-free filter value the data does not carry, naming the ones it
 * does.
 *
 * Silent when the dimension is empty across every row: an unbuilt or
 * genuinely-empty store is not the caller's mistake, and the list's own
 * `emptyRecovery` is the right voice for it.
 *
 * @throws PragmaError INVALID_INPUT when a term matches none of the observed
 *   values, carrying them as `validOptions`.
 */
function rejectUnobserved(
  rows: readonly PackRow[],
  filter: PackFilter,
  occurrences: readonly unknown[],
  terms: readonly string[],
): void {
  const observed = new Map<string, string>();
  for (const row of rows) {
    for (const value of cellValues(row, filter)) {
      const key = value.toLowerCase();
      if (!observed.has(key)) observed.set(key, value);
    }
  }
  if (observed.size === 0) return;
  const index = terms.findIndex((term) => !observed.has(term));
  if (index === -1) return;
  const validOptions = [...observed.values()].sort();
  throw PragmaError.invalidInput(filter.param, String(occurrences[index]), {
    validOptions,
    recovery: {
      message: `Values present for --${filter.param}: ${validOptions.join(", ")}.`,
    },
  });
}

/**
 * The values a row offers for one filter, in their DISPLAY spelling (NFC).
 *
 * One value for an ordinary filter; every space-separated member for a `"set"`
 * one. A row lacking the variable offers none, so it never matches. Kept in the
 * data's own casing because these are also what an INVALID_INPUT lists back as
 * `validOptions` — lowercasing here would hand the caller a value the graph does
 * not spell that way. Comparison lowercases at the point of comparison instead.
 */
function cellValues(row: PackRow, filter: PackFilter): string[] {
  const cell = row[filter.variable];
  if (cell === undefined) return [];
  const normalized = cell.normalize("NFC");
  if (filter.match !== "set") {
    return normalized === "" ? [] : [normalized];
  }
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
