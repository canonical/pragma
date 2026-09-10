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
 * THE AUTHOR QUERY IS STILL NEVER MODIFIED. Two shapes, and the choice is
 * visible in the generated text:
 *
 * - Nothing to filter: the author query plus a `LIMIT`/`OFFSET` solution
 *   modifier. SPARQL applies those after the author's own `ORDER BY`, so a page
 *   is a page of the order the author asked for, and the query the store runs
 *   is character-for-character the one it ran before plus that modifier.
 * - Something to filter: the author query becomes a sub-select inside a
 *   wrapping SELECT that carries the predicates and the page bounds. It has to
 *   be a wrap rather than an appended `HAVING`: a `match: "set"` filter reads a
 *   cell the author's own `GROUP BY` computed (`standard list`'s
 *   `GROUP_CONCAT`), so the predicate can only run after aggregation, and the
 *   cap can only run after the predicate.
 *
 * The wrapper projects the author's own variables, in the author's own order
 * ({@link ./projection.readProjection}) — `SELECT *` would hand back
 * alphabetised binding keys and change every JSON answer's shape.
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
import { escapeSparqlString } from "./escape.js";
import { readProjection } from "./projection.js";

/**
 * The variable prefix the generated predicates bind a caller's values to.
 *
 * A story whose own query already uses the prefix is refused rather than
 * silently shadowed — the failure would be a filter that matches nothing, with
 * nothing raised anywhere.
 */
const BOUND_PREFIX = "__pragma";

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
  /** The author's SPARQL SELECT, used verbatim. */
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
 * @throws PragmaError CONFIG_ERROR when a filterable story's projection cannot
 *   be read, or when its query already uses the generated variable prefix.
 */
export function buildListQuery(input: ListQueryInput): string {
  const { query, predicates, search, window, label } = input;
  const clauses = [
    ...predicates.map((predicate, index) =>
      filterClause(predicate, `${BOUND_PREFIX}Filter${index}`),
    ),
    ...(search ? [searchClause(search, `${BOUND_PREFIX}Search`)] : []),
  ];
  if (clauses.length === 0) return `${query}\n${modifier(window)}`;
  if (query.includes(BOUND_PREFIX)) {
    throw PragmaError.configError(
      `Story query in ${label} uses the reserved variable prefix "?${BOUND_PREFIX}", ` +
        "which the generated filter clauses bind a caller's values to. Rename it.",
    );
  }
  const projection = readProjection(query);
  if (!projection) {
    throw PragmaError.configError(
      `Story query in ${label} declares filters, so its SELECT must project its ` +
        "variables by name — a page has to project the same names in the same order.",
    );
  }
  return [
    `SELECT ${projection.map((variable) => `?${variable}`).join(" ")}`,
    "WHERE {",
    "  {",
    query,
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
