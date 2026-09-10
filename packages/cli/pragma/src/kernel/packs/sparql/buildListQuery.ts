/**
 * Compile a list story's declared filters, its search term and one page's
 * bounds into the SPARQL the store actually runs.
 *
 * WHY IN THE QUERY. Filters used to be predicates over the rows a query had
 * already returned. That was injection-safe and order-preserving — the two
 * properties this module has to keep — but it put filtering on the wrong side
 * of any cap: a `LIMIT` in a story's own text truncates BEFORE the filter runs,
 * so `--category testing` over a capped population answers from whatever
 * happened to be inside the window. Nothing was being truncated yet, because no
 * story declared a cap and the kernel had none to declare; the moment one
 * exists, every declared filter starts deciding over a truncated population.
 * Pagination is that cap, so the two move together and they move inward.
 *
 * ONE SHAPE, ALWAYS. The author query becomes a sub-select inside a wrapping
 * SELECT that carries the predicates and the page bounds — whether or not there
 * is anything to filter. It has to be a wrap rather than an appended `HAVING`
 * when there IS something: a `match: "set"` filter reads a cell the author's own
 * `GROUP BY` computed (`standard list`'s `GROUP_CONCAT`), so the predicate can
 * only run after aggregation, and the cap only after the predicate.
 *
 * It is a wrap when there is NOTHING to filter, too, and that is a correction.
 * Appending `LIMIT n` to the author's own text is a syntax error for every
 * story whose text already ends in a solution modifier or a trailing `VALUES`
 * block — `LIMIT` after `LIMIT`, after `OFFSET`, after `VALUES` — and because
 * the page has a DEFAULT, that error fired on every call rather than only on
 * paged ones. The shortcut existed to keep the store running, character for
 * character, the query it ran before. Measured over all nine shipped bodies
 * (median of 15 warm store queries per body, both texts, 2026-09-10) the wrap
 * ran between 2.7 ms FASTER and 0.5 ms slower, deltas straddling zero and the
 * one clear win being `block list`, the 252-row body; every body's rows came
 * back byte-identical through the wrap, key order included. So the shortcut
 * bought nothing measurable and cost a whole class of author query. Keeping it
 * would have meant a guard recognising every trailing-modifier shape the
 * grammar admits — more parsing than the wrap itself needs, to reach the
 * answer the wrap already gives.
 *
 * THE AUTHOR'S TEXT IS SPLIT, NEVER EDITED. Two parts of a query cannot live
 * inside a group graph pattern, and {@link ./authorQuery.readAuthorQuery} is
 * what tells them apart:
 *
 * - The PROLOGUE (`PREFIX`, `BASE`) is lifted to the wrapper's own prologue, in
 *   the author's order. That is a split at the `SELECT` keyword, not a rewrite:
 *   the body is a suffix of the author's text, byte for byte. A COLLIDING
 *   prefix resolves the way it always did — the store prepends the pack's own
 *   prefix map ahead of whatever it is handed, the author's declaration is
 *   emitted after it, and SPARQL's last declaration wins, so an author who
 *   redeclares `ds:` shadows the pack's `ds:` exactly as they did before any
 *   wrap existed (verified both shapes against the pinned oxigraph). The
 *   wrapper declares nothing and names no prefixed term, so it brings no
 *   prefix of its own for an author to collide with.
 * - A DATASET clause (`FROM`, `FROM NAMED`) is refused, at declaration and
 *   again here. It sits in the MIDDLE of the author's text rather than at its
 *   front, so lifting it would mean cutting a span out — an edit, not a split.
 *
 * The wrapper projects the author's own variables, in the author's own order
 * ({@link ./authorQuery}) — `SELECT *` in the wrapper would hand back
 * alphabetised binding keys and change every JSON answer's shape. An author who
 * wrote `SELECT *` themselves gets `SELECT *`, which is the same alphabetisation
 * twice and so preserves their key order; a FILTERABLE story that writes it is
 * refused, because a projection of `*` names nothing to constrain.
 *
 * USER INPUT IS BOUND, NOT SPLICED. Every value a caller supplies reaches the
 * query as a row of a `VALUES` block — the closest thing the store's text-only
 * interface has to a bound parameter — escaped by
 * {@link ./escape.escapeSparqlString}, and the predicate compares against that
 * variable rather than against interpolated text. The `VALUES` block sits
 * inside `FILTER EXISTS` deliberately: joined into the outer group it would
 * MULTIPLY rows, and a repeated flag over a `set` cell carrying two of the
 * requested members would return that row twice.
 *
 * The comparison itself is the row predicate's, transposed:
 * case-insensitively equal for `exact`, membership of a whitespace-separated
 * set for `set`, substring for search, and a cell that is unbound or empty
 * never matches. One divergence is worth naming: the row predicate NFC-
 * normalised both sides, and SPARQL has no normaliser, so the graph's own
 * spelling is compared as it is stored (the caller's side is still normalised,
 * in {@link ./filterValues}).
 */

import { PragmaError } from "../../error/index.js";
import { RESERVED_VARIABLE_PREFIX } from "../types.js";
import { readAuthorQuery } from "./authorQuery.js";
import { escapeSparqlString } from "./escape.js";

/** One declared filter, with the values a caller actually supplied. */
export interface ListPredicate {
  /** SELECT variable the filter constrains (without `?`). */
  readonly variable: string;
  /** Whole-cell comparison, or membership of a whitespace-separated set. */
  readonly match: "exact" | "set";
  /**
   * The admitted values, in the graph's own display spelling. Several are a
   * union (the row matches any of them); several FILTERS are a conjunction.
   */
  readonly terms: readonly string[];
}

/** A declared search, with the term a caller actually supplied. */
export interface ListSearch {
  /** SELECT variables searched (without `?`). */
  readonly variables: readonly string[];
  /** The normalised search term (non-empty). */
  readonly term: string;
}

/** One page's bounds, applied inside the query after filtering and ordering. */
export interface ListWindow {
  /** Maximum rows to return. */
  readonly limit: number;
  /** Rows to skip first. */
  readonly offset: number;
}

/** Everything the generated list query is composed from. */
export interface ListQueryInput {
  /** The author's SPARQL SELECT, used verbatim (split, never edited). */
  readonly query: string;
  /** The declared filters a caller supplied values for. */
  readonly predicates: readonly ListPredicate[];
  /** The declared search a caller supplied a term for. */
  readonly search?: ListSearch;
  /** The page to return. */
  readonly window: ListWindow;
  /** The story's label, for a configuration diagnosis. */
  readonly label: string;
}

/**
 * Build the SELECT one page of a list story runs.
 *
 * @param input - The author query, the supplied filters/search, and the page.
 * @returns SPARQL SELECT text composed only from author terms, escaped values
 *   and the page's own integers.
 * @throws PragmaError CONFIG_ERROR when the author query cannot be wrapped in a
 *   page, when a filterable story's projection cannot be reproduced, or when
 *   its query already uses the generated variable prefix. Each names what it
 *   found: the same refusal for three different reasons would send an author to
 *   the wrong part of their own file.
 */
export function buildListQuery(input: ListQueryInput): string {
  const { query, predicates, search, window, label } = input;
  const clauses = [
    ...predicates.map((predicate, index) =>
      filterClause(predicate, `${RESERVED_VARIABLE_PREFIX}Filter${index}`),
    ),
    ...(search
      ? [searchClause(search, `${RESERVED_VARIABLE_PREFIX}Search`)]
      : []),
  ];
  if (clauses.length > 0 && query.includes(RESERVED_VARIABLE_PREFIX)) {
    throw PragmaError.configError(
      `Story query in ${label} uses the reserved variable prefix "?${RESERVED_VARIABLE_PREFIX}", ` +
        "which the generated filter clauses bind a caller's values to. Rename it.",
    );
  }
  const read = readAuthorQuery(query);
  if (!read.ok) {
    throw PragmaError.configError(
      `Story query in ${label} cannot be paged: ${read.reason}. Every list ` +
        "answer is one page, and a page is a wrapping SELECT over the story's own query.",
    );
  }
  const { prologue, projection, body } = read.query;
  if (clauses.length > 0 && projection === undefined) {
    throw PragmaError.configError(
      `Story query in ${label} declares filters or a search, so its SELECT must ` +
        "project its variables by name — the page projects the same names in the " +
        "same order, which `SELECT *` cannot promise.",
    );
  }
  return [
    ...(prologue === "" ? [] : [prologue]),
    `SELECT ${projection ? projection.map((variable) => `?${variable}`).join(" ") : "*"}`,
    "WHERE {",
    "  {",
    body,
    "  }",
    ...clauses.map((clause) => `  ${clause}`),
    "}",
    modifier(window),
  ].join("\n");
}

/** The page as SPARQL solution modifiers (`OFFSET 0` omitted as the no-op it is). */
function modifier(window: ListWindow): string {
  return window.offset > 0
    ? `LIMIT ${window.limit} OFFSET ${window.offset}`
    : `LIMIT ${window.limit}`;
}

/**
 * One filter as a row predicate that cannot duplicate a row.
 *
 * `FILTER EXISTS` makes the `VALUES` block a per-row existence test: joining it
 * into the group instead would pair each row with every requested value, and a
 * `set` cell carrying two of them would be returned twice.
 */
function filterClause(predicate: ListPredicate, bound: string): string {
  const values = predicate.terms
    .map((term) => `"${escapeSparqlString(term)}"`)
    .join(" ");
  const cell = `?${predicate.variable}`;
  const comparison =
    predicate.match === "set"
      ? setMembership(cell, bound)
      : `STR(${cell}) != "" && LCASE(STR(${cell})) = LCASE(?${bound})`;
  return `FILTER EXISTS { VALUES ?${bound} { ${values} } FILTER(${comparison}) }`;
}

/**
 * Membership of a whitespace-separated set, spelled as a padded substring.
 *
 * The cell is a `GROUP_CONCAT` of every value a row belongs to at once — a
 * category and each of its ancestors. Padding both sides with a space is what
 * keeps it a WHOLE-member comparison, so `testing` does not match
 * `testing-unit`; collapsing runs of whitespace first reproduces the row
 * predicate's own `\s+` split, whatever separator the author's aggregate used.
 *
 * TWO WAYS IT IS WIDER THAN THE SPLIT IT REPLACED, both out of reach of every
 * vocabulary the distribution declares and both worth knowing before a
 * vocabulary is widened:
 *
 * - A value that CONTAINS whitespace matches a contiguous RUN of members: cell
 *   `"foo bar baz"`, value `"bar baz"` answers true here where
 *   `split(/\s+/).includes(value)` answered false. Unreachable today because no
 *   admissible value carries whitespace (all 21 `cs:slug` values are clean), and
 *   reachable the moment a filter declares `values: ["a b"]` or a graph
 *   vocabulary grows a multi-word term.
 * - An EMPTY value matches an EMPTY cell, because `CONTAINS(" ", " ")` is true.
 *   The row predicate answered false on an empty cell, and the `exact` branch
 *   above still does via its explicit `STR(?c) != ""` guard, which this branch
 *   has no equivalent of. Unreachable today because `readFilterVocabularies`
 *   drops empty strings from a vocabulary and `rejectUnknownValue` then refuses
 *   `""` as unadmitted — i.e. it is the ADMISSION step that closes this, not the
 *   predicate.
 */
function setMembership(cell: string, bound: string): string {
  const members = `CONCAT(" ", REPLACE(LCASE(STR(${cell})), "\\\\s+", " "), " ")`;
  return `CONTAINS(${members}, CONCAT(" ", LCASE(?${bound}), " "))`;
}

/**
 * Search as a substring test over every declared variable.
 *
 * `COALESCE(…, false)` per variable rather than one bare disjunction: an
 * unbound cell makes `CONTAINS` raise, and an error inside `||` is not reliably
 * false. The row predicate treated a missing cell as "does not contain", and so
 * does this.
 */
function searchClause(search: ListSearch, bound: string): string {
  const tests = search.variables
    .map(
      (variable) =>
        `COALESCE(CONTAINS(LCASE(STR(?${variable})), LCASE(?${bound})), false)`,
    )
    .join(" || ");
  return (
    `FILTER EXISTS { VALUES ?${bound} { "${escapeSparqlString(search.term)}" } ` +
    `FILTER(${tests}) }`
  );
}
