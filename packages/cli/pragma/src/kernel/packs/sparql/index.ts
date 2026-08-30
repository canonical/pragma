/**
 * The SPARQL path — every generated read a pack story performs, and the two
 * row operations that must NOT be generated.
 *
 * The domain is organised around one invariant: user input never reaches query
 * text. The query builders compose only from validated pack terms and escaped
 * literals, so a name a user typed becomes a SPARQL string literal or nothing;
 * `runSelect` is the single choke point every one of those trusted queries
 * goes through, which is what makes "a generated query failed" distinguishable
 * from "the user's own `graph query` failed". Filtering and search then run as
 * predicates over the resolved ROWS rather than as clauses in the query —
 * which is why they live in this domain despite touching no SPARQL at all:
 * they are the operations that would otherwise be tempting to express as query
 * text, and keeping them here keeps the temptation answered.
 *
 * The escaping primitives stay internal. They are how the builders keep that
 * invariant, not a service for composing query text elsewhere — a caller with
 * the escaper is a caller who can build an unvalidated query, which is exactly
 * the shape this domain exists to prevent.
 *
 * Two names re-exported by `buildLookupQuery.ts` for its own callers'
 * convenience — the disclosure-level field and expand selectors — are also
 * omitted. They belong to `kernel/packs/disclosure.ts`; laundering them
 * through here would make this domain look like their owner and freeze a
 * pass-through that has no reason to be permanent.
 */

export { applyPackFilters } from "./applyFilters.js";
export { applyPackSearch } from "./applySearch.js";
export {
  buildExpandQuery,
  buildLookupByIriQuery,
  buildLookupNamesQuery,
  buildLookupQuery,
  buildNameResolveQuery,
} from "./buildLookupQuery.js";
export { runSelect } from "./runSelect.js";
