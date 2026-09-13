/**
 * The provider's contract: the configuration it is built from, the handle
 * it hands an application, and the internal host its ports and the
 * framework bindings drive.
 */

import type { ActionRequest, ActionRun } from "../action/index.js";
import type { Collection } from "../collection/index.js";
import type { DataViewsState, QueryCoordinator } from "../coordinator/index.js";
import type { QueryLocation } from "../location/index.js";
import type { Channel, ReadonlyChannel } from "../observable/index.js";
import type {
  GroupPath,
  GroupTerm,
  Predicate,
  PredicateOperator,
  Query,
  QueryCommand,
  ResultWindow,
  Slice,
  SortTerm,
  WindowNavigation,
} from "../query/index.js";
import type { Completion, SourceRefusal } from "../result/index.js";
import type {
  Applicability,
  RowIdentifier,
  RowModel,
  RowRecord,
} from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import type { Selection } from "../selection/index.js";
import type { Source, SourceCapabilities } from "../source/index.js";
import type { ProviderViews, ViewStore } from "../views/index.js";
import type { QueryIssue } from "../wire/index.js";

/**
 * The provider: the one owner of a collection's state and of the ports
 * that feed it. Built once per page over a module-scope collection, a
 * source and, optionally, a location and a view store; every mount that
 * reads it calls `observe()`.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsProvider<
  TFields extends
    readonly SchemaFieldDefinition[] = readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  /** The collection this provider was built over; the witness a hook compares. */
  readonly collection: Collection<TFields, TRow>;
  /**
   * A frozen copy of what the source declares it can execute, taken once
   * when the provider is built. Connected parts, and DataTable's
   * sortable columns, offer only what is declared; a command outside it is
   * refused at the boundary and moves nothing.
   */
  readonly capabilities: SourceCapabilities;
  /**
   * The collection's snapshot: query, window, result and pending request,
   * published at every mutation boundary. Read-only at runtime.
   */
  readonly state: ReadonlyChannel<DataViewsState<TRow>>;
  /**
   * The displayed rows as one shared model: stable identities in result
   * order. Every root and every table on this provider reads the same model,
   * so no cell owns a duplicate record.
   */
  readonly rows: ReadonlyChannel<RowModel<TRow>>;
  /**
   * The owned parameters the location carries that were refused — a clause
   * the grammar, the schema or the source cannot run. Empty while the query
   * is clean, and always empty without a location.
   */
  readonly issues: ReadonlyChannel<readonly QueryIssue[]>;
  readonly selection: Selection;
  /**
   * The collection's saved views over the store the provider was given, or
   * null when it was given none: no store means no views, never views kept
   * in memory and lost on reload.
   */
  readonly views: ProviderViews | null;
  /**
   * Bounded commands, not raw dispatch. Each answers with the refusals the
   * query it would produce incurs, empty when applied; a refused command
   * publishes nothing, requests nothing and writes nothing.
   */
  readonly navigateWindow: (
    window: WindowNavigation,
  ) => readonly SourceRefusal[];
  readonly setSort: (sort: readonly SortTerm[]) => readonly SourceRefusal[];
  readonly setSearch: (search: string) => readonly SourceRefusal[];
  /**
   * Replace the grouping levels. Reserved: refused while no source declares
   * a groupable field.
   *
   * @seam grouping — read by the group header row
   */
  readonly setGroup: (group: readonly GroupTerm[]) => readonly SourceRefusal[];
  /**
   * Replace the collapsed group paths. Reserved: refused while no source
   * honours collapse.
   *
   * @seam grouping — read by the group header's disclosure
   */
  readonly setCollapsed: (
    collapsed: readonly GroupPath[],
  ) => readonly SourceRefusal[];
  /** Request the current query again; retained rows stay while it runs. */
  readonly refresh: () => void;
  /**
   * Every refusal a query would incur, from the declaration and from the
   * source's own check. Empty means executable. What a control reads before
   * offering a destination.
   */
  readonly refusals: (query: Query) => readonly SourceRefusal[];
  /**
   * Run one declared action over the given identities, or over the
   * selection when none are given. Resolves with the settled run once every
   * captured target has an outcome — a target the source reports nothing
   * for fails rather than staying pending. Successful targets leave the
   * selection; failures stay for review. Rejects when the action is not
   * declared, addresses nothing, or addresses more than the declaration
   * allows.
   */
  readonly runAction: (request: ActionRequest) => Promise<ActionRun>;
  /**
   * Start the provider's ports and return the release. Ref-counted: the
   * first observer adopts the location, starts source execution, the
   * location loop and the saved views, and asks for a page when nothing is
   * pending after that — the first page when the state is idle, the current
   * one again when an earlier observation settled it and released; the last
   * release stops all of it. Every mount that
   * reads the provider calls this in an effect, so two roots on one
   * provider do not race and a rehearsal mount and unmount leaves a
   * provider that starts again on the next observer. Construction starts
   * nothing, so a server render stays idle.
   */
  readonly observe: () => () => void;
  /**
   * Begin the next generation: query, window, result, rows and selection
   * return to the seed, and a completion of the old generation never
   * publishes into the new one.
   */
  readonly reset: () => void;
};

/**
 * Configuration of one DataViews provider: the collection it is built
 * over, the source that answers it, and the ports it drives.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsProviderConfig<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  /** The module-scope collection: schema, identity and record types. */
  readonly collection: Collection<TFields, TRow>;
  /** The source that executes the requests; its capabilities are read here. */
  readonly source: Source<TRow>;
  /**
   * Where the applied query lives — a URL through `createPlatformLocation`
   * or a memory location. Left out, the query lives in the provider alone
   * and `issues` stays empty.
   */
  readonly location?: QueryLocation | undefined;
  /**
   * How a query transition enters the location's history. Defaults to
   * `"replace"`, so a stream of edits does not bury the entry the user
   * arrived on. Seeding and canonicalizing an adopted location always
   * replace: neither is a step the user took. A transition that changes
   * the ordering always pushes, whatever this says.
   */
  readonly history?: "push" | "replace" | undefined;
  /**
   * Where the collection's saved views and presentation preferences live —
   * `createIndexedDBViewStore` from `@canonical/dataviews-core/indexeddb`, or a
   * store of the application's own. Left out, the collection has no views.
   */
  readonly views?: ViewStore | undefined;
  /** The query and window the provider starts on, and returns to on `reset()`. */
  readonly seed?:
    | {
        readonly slice?: Slice | undefined;
        readonly window?: ResultWindow | undefined;
      }
    | undefined;
};

/**
 * The provider's internal host: what its ports and the framework bindings
 * drive, and nothing an application writes reaches. Reachable through
 * `readProviderHost` on the bindings entry point.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ProviderHost<
  TFields extends
    readonly SchemaFieldDefinition[] = readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = Pick<
  DataViewsProvider<TFields, TRow>,
  "collection" | "capabilities" | "state" | "refusals"
> & {
  /** Replace the predicate at its address; the window returns to page one. */
  readonly setPredicate: (predicate: Predicate) => readonly SourceRefusal[];
  /** Remove the predicate at an address; the window returns to page one. */
  readonly removePredicate: (
    field: string,
    operator: PredicateOperator,
  ) => readonly SourceRefusal[];
  /** Request the current query again and name the request. */
  readonly refresh: () => string;
  /**
   * Adopt an externally authoritative query — back/forward, a saved view —
   * and name the request it issued, or null when the query did not move.
   */
  readonly adopt: (query: Query) => string | null;
  /** Complete the pending request; false when it is not the one pending. */
  readonly complete: (
    requestId: string,
    completion: Completion<TRow>,
  ) => boolean;
  /**
   * Whether a schema field applies to a row, by the field's type scoping.
   * Always "applies" on a monomorphic collection, and on a field the schema
   * does not scope.
   *
   * @seam typed cells — read by the body cell, whose not-applicable cell is
   * the third state beside value and empty
   */
  readonly applicability: (field: string, row: TRow) => Applicability;
  /**
   * The type remembered for a selected identity, or null when the provider
   * never modelled it while it was selected — a selection restored by a host
   * over rows this provider has not seen. A remembered type is let go when
   * the rows are next replaced after its identity leaves the selection, so
   * one reselected before then answers as before. It answers from the row on
   * display whenever there is one, so it never contradicts `applicability`,
   * and it changes only with a `rows` or a `selection` publication: watching
   * those is watching this.
   *
   * @seam actions — read by `useDataViewsAction`, which decides an action's
   * applicability to records selected on an earlier page from here
   */
  readonly recordType: (id: string) => string | null;
};

/** Configuration of one collection's record typing. */
export type RecordTypingConfig<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  /** The collection, whose declared types and scoped fields are read. */
  readonly collection: Collection<TFields, TRow>;
  /** The selection whose identities are the ones worth remembering. */
  readonly selection: Selection;
  /** The displayed rows, read for a type the memory has not taken yet. */
  readonly rows: ReadonlyChannel<RowModel<TRow>>;
};

/** One collection's record typing: what the provider answers about types. */
export type RecordTyping<TRow extends object = RowRecord> = {
  /** Why a model cannot be displayed, or null when every row is typed. */
  readonly rejectionOf: (model: RowModel<TRow>) => string | null;
  /** Whether a schema field applies to a row. */
  readonly applicability: (field: string, row: TRow) => Applicability;
  /** The remembered type of a selected identity. */
  readonly recordType: (id: string) => string | null;
  /** Take the type of every selected row of a model about to be replaced. */
  readonly remember: (model: RowModel<TRow>) => void;
  /** Drop the memory: the generation moved, so nothing displayed survives. */
  readonly forget: () => void;
};

/** Configuration of the source run: the host it feeds and the source it drives. */
export type SourceRunConfig<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  readonly host: ProviderHost<TFields, TRow>;
  readonly source: Source<TRow>;
};

/** Configuration of the location sync: the host, the location and history. */
export type LocationSyncConfig<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  readonly host: ProviderHost<TFields, TRow>;
  readonly location: QueryLocation;
  /** How a host transition enters history; see `DataViewsProviderConfig`. */
  readonly history: "push" | "replace";
};

/** One port's run: starts on `observe()`, stops through its release. */
export type PortRun = {
  readonly observe: () => () => void;
};

/** One ref-counted observation over several ports. */
export type PortsObservation = PortRun & {
  /** How many observers hold the ports right now. */
  readonly observers: number;
};

/** Configuration of one ports observation. */
export type PortsObservationConfig = {
  /** The ports, in the order they start; they stop in reverse. */
  readonly ports: readonly PortRun[];
  /** Runs once the first observer has started every port. */
  readonly afterStart: () => void;
};

/** Configuration of the provider's query path. */
export type QueryCommandsConfig<TRow extends object = RowRecord> = {
  readonly coordinator: QueryCoordinator<TRow>;
  readonly capabilities: SourceCapabilities;
  readonly source: Source<TRow>;
  /** Publish the coordinator's state after a move. */
  readonly publish: () => void;
};

/**
 * The provider's query path: the refusal check, the command boundary, and
 * the two moves the ports make.
 */
export type QueryCommands = Pick<
  ProviderHost,
  "refusals" | "adopt" | "refresh"
> & {
  /** Apply one command at the boundary; the refusals it incurs, empty when applied. */
  readonly command: (command: QueryCommand) => readonly SourceRefusal[];
};

/**
 * The location sync: the loop and the issues it publishes. On start the
 * location wins when it carries a query, and takes the host's seed when it
 * carries none. After that, every accepted host transition writes the
 * canonical query and every external location change — back, forward, a
 * pasted URL — is adopted.
 */
export type LocationSync = PortRun & {
  /** The owned parameters the location carries that were refused. */
  readonly issues: ReadonlyChannel<readonly QueryIssue[]>;
};

/** Configuration of the provider's action runner. */
export type ActionRunnerConfig<TRow extends object = RowRecord> = {
  readonly source: Source<TRow>;
  readonly capabilities: SourceCapabilities;
  readonly selection: Selection;
};

/** Configuration of the provider's completion path. */
export type RequestCompleterConfig<TRow extends object = RowRecord> = {
  readonly coordinator: QueryCoordinator<TRow>;
  /** The shared row model, written here and nowhere else. */
  readonly rows: Channel<RowModel<TRow>>;
  readonly identify: RowIdentifier<TRow>;
  /** The record typing, or null on a monomorphic collection. */
  readonly recordTyping: RecordTyping<TRow> | null;
  /** Publish the coordinator's state after a completion. */
  readonly publish: () => void;
};
