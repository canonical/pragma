/**
 * What one request produces: the envelope a source delivers, the structured
 * refusals and failures it may answer with instead, and the provenance the
 * binding stamps on the rows a renderer displays.
 *
 * A leaf module. The coordinator and every source import it, and it imports
 * only the query grammar and the row shape, so neither side has to reach
 * through the other.
 */

import type {
  GroupPath,
  PredicateOperator,
  ResultWindow,
  Slice,
} from "../query/index.js";
import type { RowRecord } from "../rows/index.js";

/**
 * A number a source claims, with how much it claims. Never a bare null:
 * "unknown" is a value, so an unfiltered total can never be read as a
 * filtered one and a missing count can never be read as zero.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Count =
  | { readonly kind: "exact"; readonly value: number }
  /** A lower bound, as Elasticsearch's `gte` relation reports one. */
  | { readonly kind: "at-least"; readonly value: number }
  | { readonly kind: "unknown" };

/**
 * Three counts with distinct provenance. `pageable`: rows the window pages
 * over, after collapse — the only basis for "page n of m". `matched`: rows
 * satisfying filter and search, before collapse. `total`: the collection
 * ignoring the query, which nothing displays yet. Without grouping
 * `pageable` equals `matched`.
 *
 * @seam summary — read by `DataViews.Summary`, which shows `total` under
 * its own label
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceCounts = {
  readonly pageable: Count;
  readonly matched: Count;
  readonly total: Count;
};

/**
 * One non-empty group of the slice. Listed pre-order — a parent before its
 * children — in the order the rows come, so headers need no re-sort. No
 * source declares summaries yet, so `groups` is null on every page this
 * release delivers.
 *
 * @seam grouping — read by the group header row's count
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type GroupSummary = {
  readonly path: GroupPath;
  readonly count: Count;
};

/**
 * Opaque tokens reaching the adjacent pages; null where none exists.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PageCursors = {
  readonly next: string | null;
  readonly previous: string | null;
};

/**
 * One page: everything a request produces, in one object, from one read of
 * the backend. Rows stay opaque to this package. A source guarantees:
 *
 * - rows are in the effective ordering (group levels, then the sort terms
 *   not already grouping, then the default, then the tiebreak);
 * - every row of a collapsed path is absent, or the request was refused;
 * - `groups` is null exactly when `capabilities.group.summaries` is "none",
 *   and otherwise lists every non-empty group of the slice, collapse
 *   ignored;
 * - `counts` claim no more than `capabilities.counts` declares.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourcePage<TRow extends object = RowRecord> = {
  readonly rows: readonly TRow[];
  readonly groups: readonly GroupSummary[] | null;
  readonly counts: SourceCounts;
  /** Whether a further page exists when no count says so; null when unknown. */
  readonly more: boolean | null;
  /** Null for offset sources. */
  readonly cursors: PageCursors | null;
};

/**
 * Which member of a request was refused. `targets` names an action
 * addressing every row a query matches; nothing declares that scope, so
 * the binding rejects such a request outright rather than answering a
 * refusal nothing could act on.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceRefusalPart =
  | "filter"
  | "search"
  | "sort"
  | "group"
  | "window"
  | "targets";

/**
 * Machine-readable cause, so a control can react without reading text.
 * `query-targets-unsupported` is the refusal a query-wide target set
 * would carry; see `SourceRefusalPart`.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceRefusalCode =
  | "undeclared-field"
  | "undeclared-operator"
  | "too-many-terms"
  | "too-many-levels"
  | "unreachable-page"
  | "unsupported-collapse"
  | "query-targets-unsupported"
  | "unsupported-combination";

/**
 * One structured refusal. A source reports what it cannot execute; it never
 * rewrites the query, truncates an ordering or answers with broader rows.
 * `field` and `operator` are null when the refusal addresses neither.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceRefusal = {
  readonly part: SourceRefusalPart;
  readonly code: SourceRefusalCode;
  readonly field: string | null;
  readonly operator: PredicateOperator | null;
  /** A lowercase fragment, for presentation beside the control it names. */
  readonly reason: string;
};

/**
 * A request the source accepted and could not complete.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceFailure = {
  /**
   * A lowercase fragment, as a refusal's reason is, so a renderer can
   * compose it into a sentence of its own: "these rows could not be
   * refreshed: the store is missing data this page selects".
   */
  readonly reason: string;
  /** The library's own error, for the application's logging; never rendered. */
  readonly cause: unknown;
  /** True when retrying the same request may succeed; null when unknown. */
  readonly transient: boolean | null;
};

/**
 * What a source delivers. Refusal is not here: it is decided before
 * execution, so a refused request costs no round trip.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceDelivery<TRow extends object = RowRecord> =
  | { readonly status: "succeeded"; readonly page: SourcePage<TRow> }
  | { readonly status: "failed"; readonly failure: SourceFailure };

/**
 * What one request completes with: a delivery, or the binding's refusal.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Completion<TRow extends object = RowRecord> =
  | SourceDelivery<TRow>
  | {
      readonly status: "refused";
      readonly refusals: readonly SourceRefusal[];
    };

/**
 * The executed request the displayed rows answer. Stamped by the binding
 * from the request it issued, never by the source, so a source cannot
 * mislabel its rows.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ResultProvenance = {
  readonly requestId: string;
  readonly slice: Slice;
  readonly window: ResultWindow;
};

/**
 * Why the last request produced nothing, structurally: the completion it
 * ended with, less the success. One shape, so a renderer switches on the
 * same `status` the source answered with.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ResultProblem = Exclude<
  Completion,
  { readonly status: "succeeded" }
>;
