/**
 * The source contract: how a data source executes the request identities
 * the collection coordinator issues, and what it declares it can execute.
 * Sources own transport, cache, retry, deduplication and invalidation
 * through the application's existing query library — this package never
 * runs a competing one.
 */

import type { OperationOutcome } from "../operation/createOperation.js";
import type {
  PredicateOperator,
  Query,
  Slice,
  SortTerm,
} from "../query/types.js";
import type { SourceDelivery, SourceRefusal } from "../result/types.js";
import type { RowRecord } from "../rows/types.js";

/** One executable request: the issued identity and the query it addresses. */
export type SourceRequest = Query & {
  readonly requestId: string;
};

/** How exactly a source can answer one count. */
export type CountSupport = "exact" | "atLeast" | "none";

/**
 * What breaks ties after the last ordered term. Named terms the source
 * appends itself; "opaque" for a stable total order it does not name (a
 * cursor, input order); "none" when ties are unordered, so offset pages may
 * repeat or skip rows across a boundary and the UI says so.
 */
export type SortTiebreak = readonly SortTerm[] | "opaque" | "none";

/**
 * Everything a source declares about ordering, in one block, so a header
 * reads its whole contract from one place. `effectiveOrdering` resolves the
 * three of them against a query into the order rows are actually in.
 */
export type SortCapabilities = {
  /** Sortable fields. A field absent here cannot be ordered. */
  readonly fields: readonly string[];
  /**
   * Maximum ordered terms. Zero means sorting is unavailable and null
   * declares no limit. Pushdown is all-or-nothing: an ordering carrying one
   * unexecutable term is refused whole, never truncated.
   */
  readonly terms: number | null;
  /**
   * The effective ordering when the query carries no sort term. Empty
   * declares that the source documents no order, so pages may not be
   * stable.
   *
   * Seam for the header unit, which will report it and have "clear sort"
   * return to it. A header over a query with no term still reports no
   * sorted column rather than the default it is in fact ordering by.
   */
  readonly default: readonly SortTerm[];
  readonly tiebreak: SortTiebreak;
  /**
   * The locale text compares under, as a BCP-47 tag with any collation
   * extension — `en-u-kn-true` is the root collation with numeric ordering
   * — or null when the source names none and text compares by code point.
   * The source's locale, never the viewer's, so a server render and a local
   * execution agree.
   */
  readonly collation: string | null;
};

/**
 * The ordering rows are actually in: the group levels, then the query's own
 * terms or the source's default when it states none, then the tiebreak the
 * source appends itself.
 *
 * `terms` never carries the tiebreak, because the tiebreak is the source's
 * and is never sent back as a user term. A field appears once: a group level
 * takes the direction of the query's own term over that field and that term
 * is not repeated below it.
 *
 * @experimental Resolved by local execution today; the header unit will read
 * it and may add whether the terms are the query's own.
 */
export type EffectiveOrdering = {
  readonly terms: readonly SortTerm[];
  readonly tiebreak: SortTiebreak;
};

/**
 * What a source declares about grouping.
 *
 * Seam for the grouping unit: every shipped source declares `depth: 0`, so
 * a grouped or collapsing request is refused rather than answered ungrouped.
 */
export type GroupCapabilities = {
  readonly fields: readonly string[];
  /** Maximum nesting; zero means grouping is unavailable. */
  readonly depth: number;
  /** Whether pages carry `groups`. */
  readonly summaries: "counts" | "none";
  /** Whether `window.collapsed` is honoured; false refuses a collapse. */
  readonly collapse: boolean;
};

/** What a source declares about each of the three counts. */
export type CountCapabilities = {
  readonly visible: CountSupport;
  readonly matched: CountSupport;
  readonly total: CountSupport;
};

/** How pages are addressed. */
export type PaginationCapabilities =
  /** Any page is reachable by number. */
  | { readonly mode: "offset" }
  /**
   * A page is reachable only through a token an adjacent page handed back.
   * `backward`: previous-page tokens exist. `durable`: tokens survive time
   * and writes (keyset); false means they may expire (server cursors).
   */
  | {
      readonly mode: "cursor";
      readonly backward: boolean;
      readonly durable: boolean;
    };

/** One row operation: what it may address, and at most how many at once. */
export type ActionCapabilities = {
  readonly targets: "explicit" | "query";
  readonly limit: number | null;
};

/**
 * What a source declares it can execute. Pure data: copied, frozen and
 * compared by the binding, carried by the provider, read by every control.
 * Absence means unavailable, never "probably supported". The binding checks
 * every declared capability against the port that must serve it, so a
 * declaration is never a promise the source cannot keep.
 */
export type SourceCapabilities = {
  /** Executable operators per field. A field absent here cannot be filtered. */
  readonly filter: Readonly<
    Partial<Record<string, readonly PredicateOperator[]>>
  >;
  /** Fields free-text search reads, or null when search is unavailable. */
  readonly search: { readonly fields: readonly string[] } | null;
  readonly sort: SortCapabilities;
  readonly group: GroupCapabilities;
  readonly counts: CountCapabilities;
  readonly pagination: PaginationCapabilities;
  /** Whether actions may address every row matching a query, not only ids. */
  readonly selection: { readonly scope: "explicit" | "query" };
  /** Row operations by name. A name absent here cannot be run. */
  readonly actions: Readonly<Record<string, ActionCapabilities>>;
};

/**
 * Who an action addresses. `query` requires `selection.scope === "query"`
 * and carries the exclusions the user made within the matching set.
 */
export type ActionTargets =
  | { readonly kind: "explicit"; readonly ids: readonly string[] }
  | {
      readonly kind: "query";
      readonly slice: Slice;
      readonly except: readonly string[];
    };

/** One row operation the source is asked to run. */
export type SourceActionRequest = {
  /** The application's action name; the source maps it to its own call. */
  readonly action: string;
  readonly targets: ActionTargets;
  readonly payload: unknown;
};

/** Execute one row operation, resolving with a per-target outcome. */
export type SourceActionRunner = (
  request: SourceActionRequest,
) => Promise<readonly OperationOutcome[]>;

/**
 * A source: a declaration plus request-scoped execution ports. The binding
 * checks at construction that every declared capability has the port that
 * serves it and throws otherwise.
 */
export type Source<TRow extends object = RowRecord> = {
  readonly capabilities: SourceCapabilities;
  /**
   * Refusals the declaration cannot express — an unreachable cursor page, a
   * filter-with-search combination one endpoint rejects. Pure and
   * synchronous over the source's own state; never a round trip. Empty when
   * the request is executable. Required of a cursor source, which alone
   * knows which pages its tokens reach.
   */
  readonly refuses?: (query: Query) => readonly SourceRefusal[];
  /**
   * Begin executing one request. `deliver` may be called synchronously and
   * more than once: every later call is an external change to the same
   * query — a store write, an invalidation — which the binding republishes
   * under a fresh identity. A throw is a failed request. The returned
   * release detaches this request's observers and nothing else: never the
   * application's client or its cache.
   */
  readonly execute: (
    request: SourceRequest,
    deliver: (delivery: SourceDelivery<TRow>) => void,
  ) => () => void;
  /** Run one action; present whenever `capabilities.actions` has a name. */
  readonly runAction?: SourceActionRunner;
};

/** How one field is read off an opaque row. */
export type FieldReader = (row: unknown, field: string) => unknown;
