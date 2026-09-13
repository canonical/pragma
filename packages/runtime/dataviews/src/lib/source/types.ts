/**
 * The source contract: how a data source executes the request identities
 * the collection coordinator issues, and what it declares it can execute.
 * Sources own transport, cache, retry, deduplication and invalidation
 * through the application's existing query library — this package never
 * runs a competing one.
 */

import type { CollectionState } from "../collection/index.js";
import type { ReadonlyChannel } from "../observable/index.js";
import type {
  ActionInvocation,
  Operation,
  OperationOutcome,
} from "../operation/index.js";
import type {
  PredicateOperator,
  Query,
  Slice,
  SortTerm,
} from "../query/index.js";
import type {
  Completion,
  Count,
  PageCursors,
  SourceDelivery,
  SourcePage,
  SourceRefusal,
} from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import type {
  AppliedOf,
  FieldKindOperators,
  Schema,
  SchemaFieldDefinition,
  TextField,
} from "../schema/index.js";
import type { Selection } from "../selection/index.js";

/**
 * One executable request: the issued identity and the query it addresses.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceRequest = Query & {
  readonly requestId: string;
};

/**
 * How exactly a source can answer one count: the best kind a page of it
 * may carry. One vocabulary with the counts themselves, so a declaration
 * of `at-least` and a page reporting `at-least` say the same thing.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type CountSupport = Count["kind"];

/**
 * What breaks ties after the last ordered term. Named terms the source
 * appends itself; "opaque" for a stable total order it does not name (a
 * cursor, input order); "none" when ties are unordered, so offset pages may
 * repeat or skip rows across a boundary and the UI says so.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SortTiebreak = readonly SortTerm[] | "opaque" | "none";

/**
 * Everything a source declares about ordering, in one block, so a header
 * reads its whole contract from one place. `effectiveOrdering` resolves the
 * three of them against a query into the order rows are actually in.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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
   * stable. A header over a query with no term still reports no sorted
   * column rather than the default it is in fact ordering by.
   *
   * @seam sort header — read by the header's sorted-column report and
   * its "clear sort", which returns to this
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
 * Resolved by local execution today.
 *
 * @seam sort header — read by the header's sorted-column report, which
 * may add whether the terms are the query's own.
 */
export type EffectiveOrdering = {
  readonly terms: readonly SortTerm[];
  readonly tiebreak: SortTiebreak;
};

/**
 * What a source declares about grouping. No source can declare it yet:
 * `declareCapabilities` refuses it for every source, so a grouped or
 * collapsing request is refused rather than answered ungrouped.
 *
 * @seam grouping — read by the grouping work's array-source declaration
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type GroupCapabilities = {
  readonly fields: readonly string[];
  /** Maximum nesting; zero means grouping is unavailable. */
  readonly levels: number;
  /** Whether pages carry `groups`. */
  readonly summaries: "counts" | "none";
  /** Whether `window.collapsed` is honoured; false refuses a collapse. */
  readonly collapse: boolean;
};

/**
 * What a source declares about each of the three counts.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type CountCapabilities = {
  readonly pageable: CountSupport;
  readonly matched: CountSupport;
  readonly total: CountSupport;
};

/**
 * How pages are addressed.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PaginationCapabilities =
  /** Any page is reachable by number. */
  | { readonly kind: "offset" }
  /**
   * A page is reachable only through a token an adjacent page handed back.
   * `backward`: previous-page tokens exist. `durable`: tokens survive time
   * and writes (keyset); false means they may expire (server cursors).
   */
  | {
      readonly kind: "cursor";
      readonly backward: boolean;
      readonly durable: boolean;
    };

/**
 * One row operation: what it may address, and at most how many at once.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
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
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceCapabilities = {
  /** Executable operators per field. A field absent here cannot be filtered. */
  readonly filter: Readonly<Record<string, readonly PredicateOperator[]>>;
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
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ActionTargets =
  | { readonly kind: "explicit"; readonly ids: readonly string[] }
  | {
      readonly kind: "query";
      readonly slice: Slice;
      readonly except: readonly string[];
    };

/**
 * One row operation the source is asked to run.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceActionRequest = {
  /** The application's action name; the source maps it to its own call. */
  readonly action: string;
  readonly targets: ActionTargets;
  readonly payload: unknown;
};

/**
 * Execute one row operation, resolving with a per-target outcome.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceActionRunner = (
  request: SourceActionRequest,
) => Promise<readonly OperationOutcome[]>;

/**
 * A source: a declaration plus request-scoped execution ports. The binding
 * checks at construction that every declared capability has the port that
 * serves it and throws otherwise.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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
  readonly refusals?: (query: Query) => readonly SourceRefusal[];
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

/** The names of a schema's fields. */
type FieldNameOf<TFields extends readonly SchemaFieldDefinition[]> =
  TFields[number]["field"];

/** The operators one field of a schema accepts, from its kind. */
type OperatorsOf<
  TFields extends readonly SchemaFieldDefinition[],
  TName extends string,
> =
  Extract<TFields[number], { readonly field: TName }> extends {
    readonly kind: infer TKind extends keyof FieldKindOperators;
  }
    ? FieldKindOperators[TKind]
    : never;

/**
 * What a source author declares, typed against the collection's schema:
 * a filter operator is checked per field kind, so `status: ["gte"]` on a
 * `choices` field does not compile, and the search and sort fields
 * against the schema's own names. A member left out is refused — no
 * filter on that field, no search, no sort, counts unknown, no actions —
 * so the unanswered case is the safe case.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type CapabilityDeclaration<
  TFields extends readonly SchemaFieldDefinition[],
> = {
  /**
   * The fields that may be filtered, each with the operators its kind
   * accepts that this source executes; `true` declares every one of them.
   */
  readonly filter?:
    | {
        readonly [TName in Exclude<TFields[number], TextField>["field"]]?:
          | readonly OperatorsOf<TFields, TName>[]
          | true;
      }
    | undefined;
  /**
   * Fields free-text search reads. They need not be schema fields: search
   * reads the row itself, and a note nothing filters or orders by is
   * still worth searching.
   */
  readonly search?: readonly string[] | undefined;
  /** What the source can order by; left out, nothing can be sorted. */
  readonly sort?:
    | {
        readonly fields: readonly FieldNameOf<TFields>[];
        /** Maximum ordered terms; null when the source sets no limit. */
        readonly terms: number | null;
        /** The ordering a query with no term runs on; empty when left out. */
        readonly default?: readonly SortTerm[] | undefined;
        /** What breaks ties after the last term; unordered when left out. */
        readonly tiebreak?: SortTiebreak | undefined;
        /** The BCP-47 tag text compares under; code point when left out. */
        readonly collation?: string | undefined;
      }
    | undefined;
  /** How exactly each count is answered; unknown when left out. */
  readonly counts?: Partial<CountCapabilities> | undefined;
  /** How pages are addressed; by number when left out. */
  readonly pagination?: PaginationCapabilities | undefined;
  /** Row operations by name; none when left out. */
  readonly actions?: Readonly<Record<string, ActionCapabilities>> | undefined;
};

/**
 * One slice read by field, typed from the schema: a `choices` filter as
 * the set of its options, a number or date filter as its bounds, a flag
 * as `true` when set, each present only when the slice carries it — plus
 * the search text and the ordered sort terms. An adapter finds the status
 * filter by name instead of scanning predicates and stringifying operands.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SliceReading<TFields extends readonly SchemaFieldDefinition[]> = {
  readonly filters: {
    readonly [TDefinition in Exclude<
      TFields[number],
      TextField
    > as TDefinition["field"]]?: TDefinition extends {
      readonly kind: "number" | "date";
    }
      ? {
          readonly gte?: AppliedOf<TDefinition>;
          readonly lte?: AppliedOf<TDefinition>;
        }
      : AppliedOf<TDefinition>;
  };
  readonly search: string | null;
  readonly sort: readonly SortTerm[];
};

/**
 * What a page is built from: the rows, the counts a backend answered —
 * given, a count is exact; left out, it is unknown — whether a further
 * page exists, and the cursors reaching the adjacent pages.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PageConfig<TRow extends object = RowRecord> = {
  readonly rows: readonly TRow[];
  /** Rows matching the query, before any collapse. */
  readonly matched?: number | undefined;
  /** Rows in the collection, ignoring the query. */
  readonly total?: number | undefined;
  /** Whether a further page exists when no count says so. */
  readonly more?: boolean | undefined;
  /** The adjacent pages' tokens, for a cursor source. */
  readonly cursors?: PageCursors | undefined;
};

/**
 * Configuration of one local-array source.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ArraySourceConfig<TRow extends object = RowRecord> = {
  /** The complete record set. Copied at construction; never read live. */
  readonly rows: readonly TRow[];
  /**
   * The collection's fields and their kinds. The source filters every field
   * of it with the operators its kind accepts and orders by every one of
   * them, comparing an ordered term through its kind. A field the schema
   * does not define is refused.
   *
   * @experimental Replaces the bare `fields` list; the row type may later be
   * inferred from it.
   */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /**
   * The ordering a query with no term of its own runs on. Empty by default,
   * which declares that the source documents no order.
   *
   * @experimental A default may later take a tiebreak of its own.
   */
  readonly defaultSort?: readonly SortTerm[] | undefined;
  /**
   * The BCP-47 tag text compares under, root collation with numeric ordering
   * by default, or null to compare by code point. The source's locale, never
   * the viewer's, so a server render and a local execution agree.
   *
   * @experimental The declared tag is not yet canonicalized against what the
   * runtime resolves.
   */
  readonly collation?: string | null | undefined;
  /**
   * Fields free-text search reads; none by default, which refuses search.
   * They need not be schema fields: search reads the row itself, and a note
   * nothing filters or orders by is still worth searching.
   */
  readonly searchFields?: readonly string[] | undefined;
  /** Row operations by name, with the runner that executes them. */
  readonly actions?: Readonly<Record<string, ActionCapabilities>> | undefined;
  /** Runs the declared row operations. Required whenever any is declared. */
  readonly runAction?: SourceActionRunner | undefined;
};

/**
 * A local-array source: a source plus the write path its owner keeps.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ArraySource<TRow extends object = RowRecord> = Source<TRow> & {
  /**
   * Replace the records. Every live request re-executes and delivers
   * again — the external-change path a live local store takes.
   */
  readonly setRows: (rows: readonly TRow[]) => void;
};

/**
 * The structural surface of one query-library observation. TanStack
 * Query's `QueryObserverResult` satisfies it, and so does any client
 * reporting the same three states. It is a product rather than a union of
 * the three states, because that is the shape those clients publish.
 */
export type QueryObservation<TData> = {
  readonly status: "pending" | "error" | "success";
  readonly data: TData | undefined;
  readonly error: unknown;
};

/** The structural surface of one query-library observer. */
export type QueryObserver<TData> = {
  /** The current observation, read once at attach time. */
  readonly getCurrentResult: () => QueryObservation<TData>;
  /** Observe later changes; the return value detaches this observer. */
  readonly subscribe: (
    listener: (observation: QueryObservation<TData>) => void,
  ) => () => void;
  /** Detach the observer from its query. The client's cache is untouched. */
  readonly destroy: () => void;
};

/** The query one observer watches. */
export type ObservedQuery<TData> = {
  readonly queryKey: readonly unknown[];
  readonly queryFn: () => Promise<TData>;
};

/**
 * Mint one observer against the application's own client, for example
 * `(query) => new QueryObserver(queryClient, query)`. The client, its
 * cache, its retries and its invalidations stay the application's.
 */
export type QueryObserverFactory<TData> = (
  query: ObservedQuery<TData>,
) => QueryObserver<TData>;

/**
 * Configuration of one query-library source.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type QuerySourceConfig<TRow extends object = RowRecord> = {
  /** What this endpoint can execute. Declared, never inferred. */
  readonly capabilities: SourceCapabilities;
  /**
   * Refusals the declaration cannot express, such as a search this endpoint
   * cannot combine with a filter. Pure and synchronous; no round trip.
   */
  readonly refusals?: ((query: Query) => readonly SourceRefusal[]) | undefined;
  /** Stable prefix of the query key; the canonical query is appended. */
  readonly queryKey: readonly unknown[];
  /**
   * Fetch one page, mapping the endpoint's answer onto the envelope.
   * Transport, retry and cancellation belong to the client this function
   * runs under.
   */
  readonly fetchPage: (request: SourceRequest) => Promise<SourcePage<TRow>>;
  /** Mint one observer against the application's client. */
  readonly createObserver: QueryObserverFactory<SourcePage<TRow>>;
  /** Row operations, when the endpoint has any. */
  readonly runAction?: SourceActionRunner | undefined;
};

/** What a Relay selector reads, and whether the store holds all of it. */
export type RelaySnapshot = {
  readonly data: unknown;
  readonly isMissingData: boolean;
};

/**
 * An executable Relay operation: its fragment selects the query's data, and
 * its request carries the compiled query's normalization selections.
 */
export type RelayOperation = {
  readonly fragment: unknown;
  readonly request: {
    readonly node: {
      readonly operation: { readonly selections: readonly unknown[] };
    };
  };
};

/**
 * The structural surface of a Relay environment. Relay's `Environment`
 * satisfies it by shape. The members are methods, so Relay's narrower
 * parameter types — its own selector, snapshot and operation — still do.
 */
export type RelayEnvironment = {
  /** Keep an operation's data in the store until disposed. */
  retain(operation: RelayOperation): { dispose(): void };
  /** Read what a selector selects from the store now. */
  lookup(selector: unknown): RelaySnapshot;
  /** Observe the store; called only when the selected data changes. */
  subscribe(
    snapshot: RelaySnapshot,
    callback: (snapshot: RelaySnapshot) => void,
  ): { dispose(): void };
  /** Fetch an operation, publishing its response into the store. */
  execute(config: { readonly operation: RelayOperation }): {
    subscribe(observer: {
      readonly error: (error: unknown) => void;
      readonly complete: () => void;
    }): { unsubscribe(): void };
  };
};

/** The page one operation is built for. */
export type RelayPageRequest = {
  readonly slice: Slice;
  /** The page size. */
  readonly first: number;
  /** The cursor the page starts after; null for the first page. */
  readonly after: string | null;
};

/**
 * The forward connection a query's data carries, in the shape the Relay
 * compiler generates for it.
 */
export type RelayConnection<TRow extends object = RowRecord> = {
  readonly edges:
    | readonly ({ readonly node: TRow | null | undefined } | null | undefined)[]
    | null
    | undefined;
  readonly pageInfo: {
    readonly endCursor?: string | null | undefined;
    /** Whether a further page exists, as the connection spec defines it. */
    readonly hasNextPage?: boolean | null | undefined;
  };
  /** The rows matching the query, when the schema counts them. */
  readonly totalCount?: number | null | undefined;
};

/**
 * Configuration of one Relay source over a compiled query type, as the
 * Relay compiler generates it: `{ response, variables }`.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type RelaySourceConfig<
  TQuery extends { readonly response: unknown } = {
    readonly response: unknown;
  },
  TRow extends object = RowRecord,
> = {
  /** What this connection can execute. Declared, never inferred. */
  readonly capabilities: SourceCapabilities;
  /** The application's own environment; its store stays the only cache. */
  readonly environment: RelayEnvironment;
  /**
   * Build one page's operation, for example
   * `(page) => createOperationDescriptor(MachinesQuery, variablesOf(page))`.
   */
  readonly operation: (page: RelayPageRequest) => RelayOperation;
  /** The connection within the query's data. */
  readonly connection: (
    data: TQuery["response"],
  ) => RelayConnection<TRow> | null | undefined;
  /** Row operations, when the schema has any. */
  readonly runAction?: SourceActionRunner | undefined;
};

/**
 * The structural host surface the binding drives. The handle
 * `createDataViewsProvider` returns satisfies it, and so can a narrower
 * host.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceHost<TRow extends object = RowRecord> = {
  /**
   * What the host's source declares it can execute, or null when the host
   * was not told. Non-null, it must be the source's own declaration.
   */
  readonly capabilities: SourceCapabilities | null;
  /** The coordinator snapshot channel: query, window and pending request. */
  readonly state: ReadonlyChannel<CollectionState<TRow>>;
  readonly selection: Selection;
  readonly refresh: () => string | null;
  readonly complete: (
    requestId: string,
    completion: Completion<TRow>,
  ) => boolean;
  readonly invokeAction: (invocation: ActionInvocation) => Operation;
};

/**
 * Configuration of one source binding.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceBindingConfig<TRow extends object = RowRecord> = {
  readonly host: SourceHost<TRow>;
  readonly source: Source<TRow>;
};

/**
 * Handle of one source binding.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SourceBinding = {
  /**
   * What the bound source declares it can execute. Connected parts read the
   * host's copy instead; this is for code holding the binding.
   */
  readonly capabilities: SourceCapabilities;
  /**
   * Every refusal a request in hand would collect, from the declaration and
   * from the source's own check. Empty means executable.
   */
  readonly refusals: (query: Query) => readonly SourceRefusal[];
  /**
   * Run one row operation. Resolves with the operation record once every
   * captured target has an outcome — a target the source reports nothing
   * for fails rather than staying pending. Successful targets leave the
   * selection; failures stay for review and retry. Rejects when the action
   * is not declared, or addresses more or other than the declaration allows.
   */
  readonly runAction: (request: SourceActionRequest) => Promise<Operation>;
  /**
   * Start executing the host's requests. The release stops the live
   * request and detaches from the host; it never touches the source's own
   * client or cache.
   */
  readonly observe: () => () => void;
};

/** What a local execution needs beyond the rows and the query. */
export type ExecuteSliceConfig = {
  /** The field kinds every predicate and every ordered term goes through. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /**
   * What the source declares about ordering: the default, the tiebreak and
   * the collation. A term — a tiebreak's included — naming no field of the
   * schema orders nothing, so an identity tiebreak needs its field there.
   */
  readonly sort: SortCapabilities;
  /** Fields free-text search reads; none by default. */
  readonly searchFields?: readonly string[];
};
