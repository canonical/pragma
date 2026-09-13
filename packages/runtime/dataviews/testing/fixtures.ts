/**
 * Declaration fixtures for tests: a source that can execute nothing, and a
 * builder that overrides one member of it. Kept in one place so a new
 * capability member does not have to be spelled into ninety test files.
 */

import type { SourceCapabilities } from "../src/lib/source/types.js";

/** A source declaring nothing executable: every request is refused. */
export const NOTHING_DECLARED: SourceCapabilities = Object.freeze({
  filter: Object.freeze({}),
  search: null,
  sort: Object.freeze({
    fields: Object.freeze([]),
    terms: 0,
    default: Object.freeze([]),
    tiebreak: "none",
    collation: null,
  }),
  group: Object.freeze({
    fields: Object.freeze([]),
    depth: 0,
    summaries: "none",
    collapse: false,
  }),
  counts: Object.freeze({ visible: "none", matched: "none", total: "none" }),
  pagination: Object.freeze({ mode: "offset" }),
  selection: Object.freeze({ scope: "explicit" }),
  lookup: null,
  actions: Object.freeze({}),
  kinds: null,
});

/** `NOTHING_DECLARED` with the named members replaced. */
export const declareCapabilities = (
  overrides: Partial<SourceCapabilities>,
): SourceCapabilities => ({ ...NOTHING_DECLARED, ...overrides });

/** A sort block over the given fields, unbounded and undocumented. */
export const declareSorting = (
  fields: readonly string[],
  terms: number | null = null,
): SourceCapabilities["sort"] => ({
  fields,
  terms,
  default: [],
  tiebreak: "opaque",
  collation: null,
});
