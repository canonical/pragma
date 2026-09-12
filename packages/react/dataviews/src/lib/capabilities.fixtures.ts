/**
 * Declaration and delivery fixtures for tests: a source that can execute
 * nothing, a builder that overrides one member of it, and the shapes a test
 * hands the provider. Kept in one place so a new capability member, or a new
 * member of the page envelope, does not have to be spelled into every test
 * file that mounts a table.
 *
 * The core package keeps the same pair beside its own source contract; this
 * is its counterpart, because the React tests declare sources too.
 */

import type {
  Completion,
  Count,
  SourceCapabilities,
} from "@canonical/dataviews-core";

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
export const declaring = (
  overrides: Partial<SourceCapabilities>,
): SourceCapabilities => ({ ...NOTHING_DECLARED, ...overrides });

/** A sort block over the given fields, with no documented order. */
export const sorting = (
  fields: readonly string[],
  terms: number | null = null,
): SourceCapabilities["sort"] => ({
  fields,
  terms,
  default: [],
  tiebreak: "opaque",
  collation: null,
});

/** All three counts answered exactly, as complete local input answers them. */
export const COUNTED_EXACTLY: SourceCapabilities["counts"] = Object.freeze({
  visible: "exact",
  matched: "exact",
  total: "exact",
});

/** One count a source claims exactly. */
export const exact = (value: number): Count => ({ kind: "exact", value });

/** A delivered page of rows, counted exactly and grouped by nothing. */
export const delivered = <TRow extends object>(
  rows: readonly TRow[],
): Completion<TRow> => ({
  status: "succeeded",
  page: {
    rows,
    groups: null,
    counts: {
      visible: exact(rows.length),
      matched: exact(rows.length),
      total: exact(rows.length),
    },
    more: null,
    cursors: null,
  },
});
