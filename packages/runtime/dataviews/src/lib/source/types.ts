/**
 * The source adapter contract: how a data source executes the request
 * identities the collection coordinator issues, and what it declares it
 * can execute. Adapters own transport, cache, retry, deduplication and
 * invalidation through the application's existing query library — this
 * package never runs a competing one.
 */

import type { CompletionResult } from "../collection/createCollectionCoordinator.js";
import type { OperationOutcome } from "../operation/createOperation.js";
import type { PredicateOperator, ResultWindow, Slice } from "../query/types.js";
import type { RowRecord } from "../rows/types.js";

/** One executable request: the issued identity and the query it addresses. */
export type SourceRequest = {
  readonly requestId: string;
  readonly slice: Slice;
  readonly window: ResultWindow;
};

/**
 * One page produced by a source: the rows-and-count of a successful
 * `CompletionResult`, without the discriminant a fetch does not need — a
 * fetch reports failure by rejecting. Rows stay opaque to this package.
 */
export type SourcePage = {
  /** The rows of the requested window. */
  readonly rows: readonly RowRecord[];
  /** The filtered total, or null when the source cannot produce one. */
  readonly count: number | null;
};

/** The part of a query a source refused. */
export type SourceRefusalPart = "filter" | "search" | "sort" | "group";

/**
 * One structured refusal. A source reports what it cannot execute; it
 * never silently rewrites the query or truncates an ordering. `field` and
 * `operator` are null when the refusal addresses neither.
 */
export type SourceRefusal = {
  readonly part: SourceRefusalPart;
  readonly field: string | null;
  readonly operator: PredicateOperator | null;
  /** The reason, for accessible presentation next to the offered control. */
  readonly reason: string;
};

/** Whether a source can execute a query, with every refusal it collected. */
export type SourceSupport =
  | { readonly status: "supported" }
  | {
      readonly status: "unsupported";
      readonly refusals: readonly SourceRefusal[];
    };

/**
 * What a source declares it can execute. Absence means unavailable, never
 * "probably supported": the UI offers only what is declared here.
 */
export type SourceCapabilities = {
  /** Executable operators per field. A field absent here cannot be filtered. */
  readonly filter: Readonly<
    Partial<Record<string, readonly PredicateOperator[]>>
  >;
  /** Fields free-text search reads; empty means search is unavailable. */
  readonly search: readonly string[];
  /**
   * Sortable fields. Sort pushdown is all-or-nothing over the requested
   * terms: a source never executes part of an ordering it cannot complete.
   */
  readonly sort: readonly string[];
  /**
   * Maximum ordered sort terms. Zero means sorting is unavailable and null
   * declares no limit.
   */
  readonly sortTerms: number | null;
  /** Groupable fields; empty means grouping is unavailable. */
  readonly group: readonly string[];
  /**
   * Whether each page carries a filtered total. A source declaring "none"
   * never has a count published, so an unfiltered total can never reach the
   * UI as the filtered one.
   */
  readonly count: "filtered" | "none";
};

/** One row operation over explicitly captured targets. */
export type SourceActionRequest = {
  /** The application's action name; the source maps it to its own call. */
  readonly action: string;
  readonly targets: readonly string[];
  readonly payload: unknown;
};

/** Execute one row operation, resolving with a per-target outcome. */
export type SourceActionRunner = (
  request: SourceActionRequest,
) => Promise<readonly OperationOutcome[]>;

/** A source adapter: one request-scoped, observable execution port. */
export type SourceAdapter = {
  readonly capabilities: SourceCapabilities;
  /**
   * Begin executing one request. `deliver` may be called synchronously and
   * more than once: a later call is an external change to the same query,
   * which the binding republishes under a fresh request identity. The
   * returned release detaches this request's observers and nothing else —
   * never the application's query client.
   */
  readonly execute: (
    request: SourceRequest,
    deliver: (result: CompletionResult) => void,
  ) => () => void;
  /** Row operations, when the source has any. */
  readonly runAction?: SourceActionRunner;
};

/** How one field is read off an opaque row. */
export type FieldReader = (row: unknown, field: string) => unknown;
