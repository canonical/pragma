/**
 * The SPARQL path — every generated read a pack story performs.
 *
 * The domain is organised around one invariant: user input never reaches query
 * TEXT. The query builders compose only from validated pack terms, the page's
 * own integers, and escaped literals bound through `VALUES` — so a name a user
 * typed becomes a SPARQL string literal or nothing; `runSelect` is the single
 * choke point every one of those trusted queries goes through, which is what
 * makes "a generated query failed" distinguishable from "the user's own
 * `graph query` failed".
 *
 * Filtering and search used to sit here as predicates over the resolved ROWS —
 * kept in this domain precisely because they were the operations it would
 * otherwise be tempting to express as query text. They are query text now, and
 * the temptation is answered a different way: {@link ./buildListQuery} is the
 * only thing that composes a predicate, it binds every caller-supplied value,
 * and it never edits the author's own query. What stayed on the row side is the
 * part that was never about rows at all — deciding whether a value is
 * ADMISSIBLE ({@link ./filterValues}), which is a question about the graph's
 * vocabulary and is what keeps a refusal distinguishable from a calm empty
 * answer.
 *
 * The escaping primitives stay internal. They are how the builders keep that
 * invariant, not a service for composing query text elsewhere — a caller with
 * the escaper is a caller who can build an unvalidated query, which is exactly
 * the shape this domain exists to prevent. {@link ./projection}'s reader is
 * internal for the same reason: it exists so a wrapping select can reproduce
 * the author's own projection, not so callers can reason about author text.
 *
 * Two names re-exported by `buildLookupQuery.ts` for its own callers'
 * convenience — the disclosure-level field and expand selectors — are also
 * omitted. They belong to `kernel/packs/disclosure.ts`; laundering them
 * through here would make this domain look like their owner and freeze a
 * pass-through that has no reason to be permanent.
 */

export type {
  ListPredicate,
  ListSearch,
  ListWindow,
} from "./buildListQuery.js";
export { buildListQuery } from "./buildListQuery.js";
export {
  buildExpandQuery,
  buildLookupByIriQuery,
  buildLookupNamesQuery,
  buildLookupQuery,
  buildNameResolveQuery,
} from "./buildLookupQuery.js";
export type { FilterVocabularies } from "./filterValues.js";
export { resolveFilterPredicates } from "./filterValues.js";
export { runSelect } from "./runSelect.js";
export { readSearchTerm } from "./searchTerm.js";
