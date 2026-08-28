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
 * admissible values as `validOptions` — the same courtesy a declared-`values`
 * filter has always extended, without copying the vocabulary into the consumer.
 * The vocabulary is read from the graph, because the graph IS the vocabulary; a
 * story that hard-coded the slugs would go stale the first time the data grew a
 * category. Before this, a typo'd `--category` returned
 * `{"ok":true,"data":[],"meta":{}}` — indistinguishable, over MCP, from a
 * genuinely empty category.
 *
 * WHICH part of the graph is the vocabulary matters, and it is NOT the rows.
 * Rows are a population: a value can be perfectly real while no row carries it —
 * `standard categories` lists a category with count 0, `ds:ConceptType` declares
 * "Decision guide" before any concept uses it. Validating against rows called
 * those `INVALID_INPUT`, when the documented answer is a calm empty list. So a
 * filter DECLARES where its vocabulary lives ({@link PackFilter.vocabulary},
 * resolved by the caller and handed in here), and the observed rows are the
 * fallback for a filter that declares none — the only evidence there is, and
 * knowingly narrower than the truth.
 */

import { PragmaError } from "../../error/index.js";
import type { PackFilter, PackRow } from "../types.js";

/**
 * Authoritative values per filter `param`, read from each filter's declared
 * `vocabulary`. A param absent from the map falls back to the observed rows.
 */
export type FilterVocabularies = ReadonlyMap<string, readonly string[]>;

/**
 * @param rows - Rows produced by the pack's list query.
 * @param filters - Declared filters (absent means no filtering).
 * @param params - Story parameters as provided by the surface.
 * @param vocabularies - Authoritative values per filter param, resolved from
 *   each filter's declared `vocabulary` (see {@link FilterVocabularies}).
 * @returns Rows matching every provided filter.
 * @throws PragmaError INVALID_INPUT when a value is not in a filter's declared
 *   set, or when a value-free filter receives a non-string value.
 */
export function applyPackFilters(
  rows: PackRow[],
  filters: readonly PackFilter[] | undefined,
  params: Record<string, unknown>,
  vocabularies?: FilterVocabularies,
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
    // The fallback vocabulary is read from the UNFILTERED rows: a value that
    // exists but is excluded by a conjunction is a legitimately empty answer,
    // not a bad argument.
    if (values === undefined)
      rejectUnknownValue(
        vocabularies?.get(filter.param) ?? observedValues(rows, filter),
        filter,
        occurrences,
        terms,
      );
    result = result.filter((row) =>
      cellValues(row, filter).some((value) =>
        terms.includes(value.toLowerCase()),
      ),
    );
  }
  return result;
}

/**
 * The values the rows themselves carry — the fallback vocabulary for a filter
 * that declares no authoritative one, in the data's own DISPLAY spelling.
 */
function observedValues(
  rows: readonly PackRow[],
  filter: PackFilter,
): string[] {
  const observed = new Map<string, string>();
  for (const row of rows) {
    for (const value of cellValues(row, filter)) {
      const key = value.toLowerCase();
      if (!observed.has(key)) observed.set(key, value);
    }
  }
  return [...observed.values()];
}

/**
 * Reject a value-free filter value the vocabulary does not admit, naming the
 * ones it does.
 *
 * Silent when the vocabulary is EMPTY: an unbuilt or genuinely-empty store is
 * not the caller's mistake, and the list's own `emptyRecovery` is the right
 * voice for it.
 *
 * A value the vocabulary admits is never rejected here even when no row carries
 * it — a real slug with zero standards is a calm empty list, which is what the
 * tool descriptions document and what `standard categories` reporting count 0
 * promises.
 *
 * @throws PragmaError INVALID_INPUT when a term matches none of the admissible
 *   values, carrying them as `validOptions`.
 */
function rejectUnknownValue(
  vocabulary: readonly string[],
  filter: PackFilter,
  occurrences: readonly unknown[],
  terms: readonly string[],
): void {
  const admissible = new Map<string, string>();
  for (const value of vocabulary) {
    const key = value.normalize("NFC").toLowerCase();
    if (!admissible.has(key)) admissible.set(key, value.normalize("NFC"));
  }
  if (admissible.size === 0) return;
  const index = terms.findIndex((term) => !admissible.has(term));
  if (index === -1) return;
  const validOptions = [...admissible.values()].sort();
  throw PragmaError.invalidInput(filter.param, String(occurrences[index]), {
    validOptions,
    recovery: {
      message: `Values allowed for --${filter.param}: ${validOptions.join(", ")}.`,
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
