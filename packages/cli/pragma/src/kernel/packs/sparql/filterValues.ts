/**
 * Admit (or refuse) the values a caller supplied for a list story's declared
 * filters, and hand the admitted ones to the query builder.
 *
 * This is the half of filtering that does NOT move into the query. Deciding
 * whether a value is admissible is a question about the graph's vocabulary;
 * deciding which rows carry it is a question about the population. Keeping them
 * apart is what makes the two answers a caller gets distinguishable, and that
 * distinction is load-bearing:
 *
 * - a value the vocabulary does NOT admit is `INVALID_INPUT`, carrying the
 *   admissible values as `validOptions` — the caller mistyped;
 * - a value it DOES admit that no row carries is a calm empty list, exit 0,
 *   with the story's own `emptyRecovery` as the hint — `standard categories`
 *   reports a category with count 0, and asking for it is not a mistake.
 *
 * WHICH part of the graph is the vocabulary matters, and it is not the rows.
 * Before the filters moved inside the query the rows were the FALLBACK
 * vocabulary for a filter that declared none — knowingly narrower than the
 * truth, but the only evidence there was. A page makes that fallback actively
 * wrong: a real value outside the window would be refused as a bad argument,
 * with a truncated list of alternatives. So the fallback is gone and the
 * declaration rule replaces it — a filter declares `values` or a `vocabulary`
 * query, and one that declares neither is refused where it is declared
 * ({@link ../schema}) rather than misanswering at run time.
 */

import { PragmaError } from "../../error/index.js";
import type { PackFilter } from "../types.js";
import type { ListPredicate } from "./buildListQuery.js";

/**
 * Authoritative values per filter `param`, read from each filter's declared
 * `vocabulary`. A filter with declared `values` needs no entry — the set IS the
 * vocabulary.
 */
export type FilterVocabularies = ReadonlyMap<string, readonly string[]>;

/**
 * Turn the filter arguments a caller supplied into query predicates.
 *
 * @param filters - The story's declared filters (absent means none).
 * @param params - Story parameters as provided by the surface.
 * @param vocabularies - Authoritative values per value-free filter param.
 * @param label - The story's label, for a configuration diagnosis.
 * @returns One predicate per filter the caller supplied a value for.
 * @throws PragmaError INVALID_INPUT when a value is not in a filter's declared
 *   set or its graph vocabulary, or when a value-free filter receives a
 *   non-string value; CONFIG_ERROR when a value-free filter declares no
 *   vocabulary.
 */
export function resolveFilterPredicates(
  filters: readonly PackFilter[] | undefined,
  params: Record<string, unknown>,
  vocabularies: FilterVocabularies | undefined,
  label: string,
): ListPredicate[] {
  const predicates: ListPredicate[] = [];
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
        ? requireStringValue(occurrence, filter)
        : canonicalizeFilterValue(occurrence, filter, values),
    );
    if (values === undefined) {
      rejectUnknownValue(
        requireVocabulary(filter, vocabularies, label),
        filter,
        occurrences,
        terms,
      );
    }
    predicates.push({
      variable: filter.variable,
      match: filter.match ?? "exact",
      terms,
    });
  }
  return predicates;
}

/**
 * The vocabulary a value-free filter is checked against.
 *
 * @throws PragmaError CONFIG_ERROR when the filter declares neither `values`
 *   nor a `vocabulary` — the declaration rule the schema enforces, restated at
 *   the point of use so a story that reached here another way still says why.
 */
function requireVocabulary(
  filter: PackFilter,
  vocabularies: FilterVocabularies | undefined,
  label: string,
): readonly string[] {
  const vocabulary = vocabularies?.get(filter.param);
  if (vocabulary) return vocabulary;
  throw PragmaError.configError(
    `Filter "--${filter.param}" in ${label} declares neither "values" nor a ` +
      '"vocabulary" query, so there is nothing to check a caller\'s value against.',
  );
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
  const index = terms.findIndex((term) => !admissible.has(term.toLowerCase()));
  if (index === -1) return;
  const validOptions = [...admissible.values()].sort();
  throw PragmaError.invalidInput(filter.param, String(occurrences[index]), {
    validOptions,
    recovery: {
      message: `Values allowed for --${filter.param}: ${validOptions.join(", ")}.`,
    },
  });
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
