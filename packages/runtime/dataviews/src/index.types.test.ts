/**
 * Compile-time contract tests for the package's public type surface.
 *
 * Runtime behaviour lives in the sibling test files; this file pins the type
 * exports of each entry point through its barrel: removing a name from a
 * barrel, adding one without a decision, or changing one of the pinned
 * shapes fails here.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ActionCapabilities,
  ActionFailure,
  ActionOutcome,
  ActionRequest,
  ActionRun,
  ActionTargets,
  AppliedOf,
  ArraySource,
  ArraySourceConfig,
  CapabilityDeclaration,
  ChoicesField,
  Collection,
  CollectionConfig,
  Completion,
  Count,
  CountCapabilities,
  CountSupport,
  DataViewsProvider,
  DataViewsProviderConfig,
  DataViewsSnapshot,
  DataViewsState,
  DateField,
  DecodedQuery,
  DecodeQueryConfig,
  DisplayStatus,
  EmptyOr,
  EmptyPlacement,
  EncodeQueryConfig,
  Facet,
  FieldKind,
  FieldValidation,
  FilterFeedback,
  FilterHandle,
  FilterHandles,
  FilterInputState,
  FlagField,
  GroupCapabilities,
  GroupPath,
  GroupSummary,
  GroupTerm,
  HistoryMode,
  HistoryPolicy,
  JsonValue,
  MemoryLocationConfig,
  NumberField,
  PageConfig,
  PageCursors,
  PaginationCapabilities,
  PlatformLocation,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  PreferenceResult,
  Presentation,
  PresentationPatch,
  PresentationState,
  PresentationStore,
  PresentationTarget,
  Query,
  QueryIssue,
  QueryIssueCode,
  QueryLocation,
  QuerySourceConfig,
  QueryTransition,
  ReadonlyChannel,
  RecordTypes,
  RelaySourceConfig,
  ResultProblem,
  ResultProvenance,
  ResultState,
  ResultStatus,
  ResultWindow,
  RowEntry,
  RowIdentifier,
  RowModel,
  RowRecord,
  SavedView,
  SavedViews,
  Schema,
  SchemaFieldDefinition,
  SchemaPredicateResult,
  Selection,
  SelectionState,
  Slice,
  SliceReading,
  SortCapabilities,
  SortDirection,
  SortTerm,
  SortTiebreak,
  Source,
  SourceActionRequest,
  SourceActionRunner,
  SourceCapabilities,
  SourceCounts,
  SourceDelivery,
  SourceFailure,
  SourcePage,
  SourceRefusal,
  SourceRefusalCode,
  SourceRefusalPart,
  SourceRequest,
  TextField,
  UnreadableView,
  ViewChanges,
  ViewCommand,
  ViewCommandState,
  ViewCreateResult,
  ViewDraft,
  ViewGetResult,
  ViewList,
  ViewOutcome,
  ViewPresentation,
  ViewRemoveResult,
  ViewRevision,
  ViewSettledOutcome,
  ViewStore,
  ViewsState,
  ViewUpdateResult,
  WindowNavigation,
} from "./index.js";
import * as dataviews from "./index.js";
import type {
  Applicability,
  ArrangedColumn,
  ColumnLayout,
  ColumnLayoutConfig,
  ColumnLayoutState,
  ColumnSizing,
  ColumnToSize,
  DeclaredColumn,
  DisplayEntriesConfig,
  DisplayEntry,
  DisplayEntryKind,
  DisplayPagination,
  EffectiveOrdering,
  FilterInputs,
  FilterInputsConfig,
  FixedSizing,
  FlexSizing,
  GridInteraction,
  GridInteractionState,
  ProviderHost,
  QueryCommand,
  QueryCommandResult,
  ResolvedColumn,
  RowChannels,
  RowScopes,
  RowScopesConfig,
  SizingBounds,
} from "./lib/bindings/index.js";
import * as bindings from "./lib/bindings/index.js";
import type {
  IndexedDBFactory,
  IndexedDBViewStoreConfig,
} from "./lib/indexeddb/index.js";
import type {
  MountedRange,
  MountedRun,
  VirtualRange,
  VirtualRangeConfig,
} from "./lib/virtualization/index.js";

/** A consumer's own row type: an interface, with no index signature. */
type Machine = { readonly id: string; readonly cpu: number };

/** Every type the package root re-exports, as one enumerable tuple. */
type EveryPublicType = [
  ActionCapabilities,
  ActionFailure,
  ActionOutcome,
  ActionRequest,
  ActionRun,
  ActionTargets,
  AppliedOf<FlagField>,
  ArraySource,
  ArraySourceConfig,
  CapabilityDeclaration<readonly SchemaFieldDefinition[]>,
  ChoicesField,
  Collection,
  CollectionConfig<readonly SchemaFieldDefinition[], RowRecord>,
  Completion,
  Count,
  CountCapabilities,
  CountSupport,
  DataViewsProvider,
  DataViewsProviderConfig<readonly SchemaFieldDefinition[]>,
  DataViewsSnapshot,
  DataViewsState,
  DateField,
  DecodedQuery,
  DecodeQueryConfig,
  DisplayStatus,
  EmptyOr<unknown>,
  EmptyPlacement,
  Facet,
  EncodeQueryConfig,
  FieldKind,
  FieldValidation,
  FilterFeedback,
  FilterHandle<unknown>,
  FilterHandles<readonly SchemaFieldDefinition[]>,
  FilterInputState,
  FlagField,
  GroupCapabilities,
  GroupPath,
  GroupSummary,
  GroupTerm,
  HistoryMode,
  HistoryPolicy,
  JsonValue,
  MemoryLocationConfig,
  NumberField,
  PageCursors,
  PageConfig,
  PaginationCapabilities,
  PlatformLocation,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  PreferenceResult,
  PresentationPatch,
  PresentationTarget,
  Presentation,
  PresentationState,
  PresentationStore,
  Query,
  QueryIssue,
  QueryIssueCode,
  QueryLocation,
  QuerySourceConfig,
  QueryTransition,
  ReadonlyChannel<unknown>,
  RecordTypes,
  RelaySourceConfig,
  ResultProblem,
  ResultProvenance,
  ResultState,
  ResultStatus,
  ResultWindow,
  RowEntry<RowRecord>,
  RowIdentifier<RowRecord>,
  RowModel<RowRecord>,
  RowRecord,
  SavedView,
  SavedViews,
  Schema<readonly SchemaFieldDefinition[]>,
  SchemaFieldDefinition,
  SchemaPredicateResult,
  Selection,
  SelectionState,
  Slice,
  SliceReading<readonly SchemaFieldDefinition[]>,
  SortCapabilities,
  SortDirection,
  SortTerm,
  SortTiebreak,
  Source,
  SourceActionRequest,
  SourceActionRunner,
  SourceCapabilities,
  SourceCounts,
  SourceDelivery,
  SourceFailure,
  SourcePage,
  SourceRefusal,
  SourceRefusalCode,
  SourceRefusalPart,
  SourceRequest,
  TextField,
  UnreadableView,
  ViewCommand,
  ViewCommandState,
  ViewChanges,
  ViewCreateResult,
  ViewDraft,
  ViewGetResult,
  ViewList,
  ViewOutcome,
  ViewPresentation,
  ViewRemoveResult,
  ViewRevision,
  ViewSettledOutcome,
  ViewsState,
  ViewStore,
  ViewUpdateResult,
  WindowNavigation,
];

/** Every type the binding entry point exports, as one enumerable tuple. */
type EveryBindingType = [
  Applicability,
  ArrangedColumn,
  ColumnLayout,
  ColumnLayoutConfig,
  ColumnLayoutState,
  ColumnSizing,
  ColumnToSize,
  DeclaredColumn,
  DisplayEntriesConfig,
  DisplayEntry,
  DisplayEntryKind,
  DisplayPagination,
  EffectiveOrdering,
  FilterInputs<readonly SchemaFieldDefinition[]>,
  FilterInputsConfig<readonly SchemaFieldDefinition[]>,
  FixedSizing,
  FlexSizing,
  GridInteraction,
  GridInteractionState,
  ProviderHost,
  QueryCommand,
  QueryCommandResult,
  ResolvedColumn,
  RowChannels<RowRecord>,
  RowScopes<RowRecord>,
  RowScopesConfig<RowRecord>,
  SizingBounds,
];

/** Every type the saved-view entry point exports, as one enumerable tuple. */
type EveryIndexedDBType = [IndexedDBFactory, IndexedDBViewStoreConfig];

/**
 * The type names an entry-point barrel puts on the surface. Only an
 * explicit `export type { … } from` line counts: a barrel that re-exported a
 * domain whole would carry whatever that domain carries, so the walk fails
 * on one rather than following it.
 */
const listTypeSurface = (barrel: string): string[] => {
  const text = readFileSync(barrel, "utf8");
  const wildcard = text.match(/^export (?:type )?\* from "[^"]+";/m);
  if (wildcard !== null) {
    throw new Error(`${barrel} re-exports a domain whole: ${wildcard[0]}`);
  }
  const names: string[] = [];
  for (const [, list = ""] of text.matchAll(
    /^export type \{([^}]*)\} from "[^"]+";/gms,
  )) {
    for (const entry of list.split(",")) {
      const name = entry
        .trim()
        .split(/\s+as\s+/)
        .pop();
      if (name !== undefined && name !== "") {
        names.push(name);
      }
    }
  }
  return names;
};

/** The names this file pins for one entry point, read from its own import. */
const listPinned = (specifier: string): string[] => {
  // Resolved from the package root, which is where the suite runs: the
  // module's own URL is not a file URL in every project this runs under.
  const text = readFileSync(path.resolve("src/index.types.test.ts"), "utf8");
  const block = text.match(
    new RegExp(`import type \\{([^}]*)\\} from "${specifier}";`, "s"),
  );
  if (block === null) {
    throw new Error(`this file must import its pins from ${specifier}`);
  }
  return (block[1] ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
};

describe("public surface types", () => {
  it("re-exports the root's type surface name by name", () => {
    // The import above is checked by the compiler, so a name that leaves
    // the barrel fails to compile. This is the other direction: a name that
    // *enters* it without a decision, which no type assertion can catch.
    const surface = [
      ...new Set(listTypeSurface(path.resolve("src/lib/index.ts"))),
    ].sort();
    expect(surface).toEqual(listPinned("\\./index\\.js").sort());
    // No member of the surface has collapsed to `any`.
    expectTypeOf<EveryPublicType[number]>().not.toBeAny();
  });

  it("publishes the root through one line of the package entry", () => {
    // The entry file is what `.` resolves to; the walk above reads the
    // barrel behind it, so the entry must hold that barrel and nothing else.
    const text = readFileSync(path.resolve("src/index.ts"), "utf8");
    const exports = text.match(/^export .*$/gm) ?? [];
    expect(exports).toEqual(['export * from "./lib/index.js";']);
  });

  it("re-exports the binding entry point's type surface name by name", () => {
    const surface = [
      ...new Set(listTypeSurface(path.resolve("src/lib/bindings/index.ts"))),
    ].sort();
    expect(surface).toEqual(listPinned("\\./lib/bindings/index\\.js").sort());
    expectTypeOf<EveryBindingType[number]>().not.toBeAny();
    // Nothing a binding takes from here is also on the application root.
    for (const name of surface) {
      expect(listTypeSurface(path.resolve("src/lib/index.ts"))).not.toContain(
        name,
      );
    }
  });

  it("keeps the provider's owned records off every entry point", () => {
    // What the provider builds and owns is not exported: the coordinator,
    // the filter input, the action run, the row model and the selection
    // factories, the slice algebra, the request check, the snapshot writer
    // and the wire's reading of the open view.
    for (const owned of [
      "createQueryCoordinator",
      "createFilterInput",
      "createActionRun",
      "createRecordTyping",
      "createRowModel",
      "runSource",
      "syncLocation",
      "registerProviderHost",
      "createSelection",
      "createPresentation",
      "createMemoryPresentationStore",
      "createPreferenceLayer",
      "createPreferenceWriter",
      "createSavedViews",
      "createViewCommands",
      "createSnapshot",
      "createCommandQueue",
      "createIndexedDBConnection",
      "applyWindow",
      "stringifyStable",
      "collapseSortTerms",
      "executeSlice",
      "refusalsOf",
      "readField",
      "readOpenView",
      "VIEW_KEY",
      "isCalendarDate",
    ]) {
      expect(dataviews).not.toHaveProperty(owned);
      expect(bindings).not.toHaveProperty(owned);
    }
  });

  it("keeps only the saved-view store behind ./indexeddb", () => {
    expectTypeOf<EveryIndexedDBType>().not.toBeAny();
    expectTypeOf<EveryIndexedDBType[number]>().not.toBeAny();
    // The contract itself is at the root, where types cost no bytes.
    expectTypeOf<
      ViewStore["create"]
    >().returns.resolves.toEqualTypeOf<ViewCreateResult>();
    expectTypeOf<SavedViews["state"]>().toEqualTypeOf<
      ReadonlyChannel<ViewsState>
    >();
  });

  it("exports the virtual range types from their own entry point", () => {
    expectTypeOf<
      [MountedRange, MountedRun, VirtualRange, VirtualRangeConfig]
    >().not.toBeAny();
    expectTypeOf<MountedRange["runs"]>().toEqualTypeOf<readonly MountedRun[]>();
    expectTypeOf<VirtualRange["measure"]>().returns.toEqualTypeOf<number>();
  });

  it("keeps display entries open to new kinds, heights and positions", () => {
    // A kind joins the union, and the range then needs its estimate.
    expectTypeOf<DisplayEntryKind>().toEqualTypeOf<"record" | "status">();
    expectTypeOf<VirtualRangeConfig["estimates"]>().toEqualTypeOf<
      Readonly<Record<DisplayEntryKind, number>>
    >();
    // Every kind carries its own logical position and owning group.
    expectTypeOf<DisplayEntry>()
      .toHaveProperty("index")
      .toEqualTypeOf<number>();
    expectTypeOf<DisplayEntry>()
      .toHaveProperty("parent")
      .toEqualTypeOf<string | null>();
    // A status entry carries the core's own status, decided once.
    expectTypeOf<
      Extract<DisplayEntry, { readonly kind: "status" }>["status"]
    >().toEqualTypeOf<DisplayStatus>();
  });

  it("spells one status vocabulary, in one casing, with its phases", () => {
    expectTypeOf<DisplayStatus["status"]>().toEqualTypeOf<
      | "pending"
      | "regrouping"
      | "failed"
      | "refresh-failed"
      | "stale"
      | "no-data"
      | "no-results"
    >();
    // The failures carry their reason; the rest say what they are.
    expectTypeOf<
      Extract<DisplayStatus, { readonly reason: string }>["status"]
    >().toEqualTypeOf<"failed" | "refresh-failed" | "stale">();
    expectTypeOf(bindings.DISPLAY_STATUS_PHASES).toEqualTypeOf<
      Readonly<Record<DisplayStatus["status"], "terminal" | "transient">>
    >();
    // The pagination facts carry the count's exactness, never a bare number.
    expectTypeOf<DisplayPagination["total"]>().toEqualTypeOf<Count>();
  });

  it("exports the provider check with the declared shape", () => {
    expectTypeOf(bindings.isDataViewsProvider)
      .parameter(0)
      .toEqualTypeOf<unknown>();
    // A check, not a narrowing: a caller holds a provider typed over its
    // own collection, which no default-typed predicate could hand back.
    expectTypeOf(bindings.isDataViewsProvider).returns.toEqualTypeOf<boolean>();
  });

  it("exports the query grammar, and keeps slice equality the provider's own", () => {
    expect(bindings).not.toHaveProperty("areSlicesEqual");
    expectTypeOf<Query>().toEqualTypeOf<{
      readonly slice: Slice;
      readonly window: ResultWindow;
    }>();
    // Paging never addresses collapse; `setCollapsed` alone does.
    expectTypeOf<WindowNavigation>().toEqualTypeOf<
      Partial<Omit<ResultWindow, "collapsed">>
    >();
  });

  it("publishes every record's state on one channel", () => {
    expectTypeOf<Selection["state"]>().toEqualTypeOf<
      ReadonlyChannel<SelectionState>
    >();
    expectTypeOf<ColumnLayout["state"]>().toEqualTypeOf<
      ReadonlyChannel<ColumnLayoutState>
    >();
    expectTypeOf<GridInteraction["state"]>().toEqualTypeOf<
      ReadonlyChannel<GridInteractionState>
    >();
  });

  it("discriminates the completion and outcome unions by status", () => {
    expectTypeOf<Completion["status"]>().toEqualTypeOf<
      "succeeded" | "failed" | "refused"
    >();
    expectTypeOf<ResultStatus>().toEqualTypeOf<
      | "idle"
      | "pending"
      | "refreshing"
      | "ready"
      | "refresh-failed"
      | "stale"
      | "failed"
    >();
    expectTypeOf<ActionRun["status"]>().toEqualTypeOf<"succeeded" | "failed">();
    // Feedback discriminates on status, as every other union here does.
    expectTypeOf<FilterFeedback["status"]>().toEqualTypeOf<
      "none" | "applied" | "incomplete" | "invalid" | "refused"
    >();
    expectTypeOf<FilterInputState>()
      .toHaveProperty("input")
      .toEqualTypeOf<string>();
    expectTypeOf<ResultWindow["page"]>().toEqualTypeOf<number>();
  });

  it("infers applied types from one schema construction", () => {
    const machines = dataviews.createSchema([
      { field: "status", kind: "choices", options: ["failed", "cancelled"] },
      { field: "cpu", kind: "number" },
      { field: "owner", kind: "flag" },
    ]);
    type Machines = FilterHandles<typeof machines.fields>;
    expectTypeOf<Machines["status"]["isAny"]["applied"]>().toEqualTypeOf<
      ReadonlyChannel<EmptyOr<ReadonlySet<"failed" | "cancelled">>>
    >();
    expectTypeOf<Machines["cpu"]["gte"]["applied"]>().toEqualTypeOf<
      ReadonlyChannel<EmptyOr<number>>
    >();
    expectTypeOf<Machines["owner"]["isSet"]["applied"]>().toEqualTypeOf<
      ReadonlyChannel<EmptyOr<boolean>>
    >();
  });

  it("takes the provider's bounded commands one object at a time", () => {
    expectTypeOf<
      DataViewsProvider["navigateWindow"]
    >().parameters.toEqualTypeOf<[WindowNavigation]>();
    expectTypeOf<DataViewsProvider["setGroup"]>().parameters.toEqualTypeOf<
      [readonly GroupTerm[]]
    >();
    expectTypeOf<DataViewsProvider["setCollapsed"]>().parameters.toEqualTypeOf<
      [readonly GroupPath[]]
    >();
    expectTypeOf<DataViewsProvider["runAction"]>().parameters.toEqualTypeOf<
      [ActionRequest]
    >();
    expectTypeOf<
      DataViewsProvider["runAction"]
    >().returns.resolves.toEqualTypeOf<ActionRun>();
    // Every query command answers with the refusals it would incur.
    expectTypeOf<
      ReturnType<
        DataViewsProvider[
          | "navigateWindow"
          | "setSort"
          | "setSearch"
          | "setGroup"
          | "setCollapsed"]
      >
    >().toEqualTypeOf<readonly SourceRefusal[]>();
    expectTypeOf<DataViewsProvider<readonly SchemaFieldDefinition[], Machine>>()
      .toHaveProperty("state")
      .toEqualTypeOf<ReadonlyChannel<DataViewsState<Machine>>>();
  });

  it("keeps the host's members off the provider an application holds", () => {
    // What the ports and the framework bindings drive reaches them through
    // the host on `./bindings`, never through the provider.
    expectTypeOf<DataViewsProvider>().not.toHaveProperty("adopt");
    expectTypeOf<DataViewsProvider>().not.toHaveProperty("complete");
    expectTypeOf<DataViewsProvider>().not.toHaveProperty("dispose");
    expectTypeOf<DataViewsProvider>().not.toHaveProperty("invokeAction");
    expectTypeOf<DataViewsProvider>().not.toHaveProperty("setPredicate");
    expectTypeOf<DataViewsProvider>().not.toHaveProperty("removePredicate");
    expectTypeOf<DataViewsProvider>().not.toHaveProperty("applicability");
    expectTypeOf<DataViewsProvider>().not.toHaveProperty("recordType");
    expectTypeOf<DataViewsProvider>().not.toHaveProperty("fields");
    expectTypeOf<DataViewsProvider>().not.toHaveProperty("schema");
    expectTypeOf<ProviderHost<readonly SchemaFieldDefinition[], Machine>>()
      .toHaveProperty("complete")
      .parameters.toEqualTypeOf<[string, Completion<Machine>]>();
    expectTypeOf<ProviderHost["adopt"]>().parameters.toEqualTypeOf<
      [Query, "adopt" | "view" | "revert", string | null]
    >();
    expectTypeOf<ProviderHost["refresh"]>().returns.toEqualTypeOf<string>();
    expectTypeOf<DataViewsProvider["refresh"]>().returns.toEqualTypeOf<void>();
  });

  it("carries the source's declaration, never null, on the provider and its host", () => {
    expectTypeOf<
      DataViewsProvider["capabilities"]
    >().toEqualTypeOf<SourceCapabilities>();
    expectTypeOf<
      ProviderHost["capabilities"]
    >().toEqualTypeOf<SourceCapabilities>();
    // The provider reads it from the source; the configuration carries no
    // copy to keep in step.
    type ProviderConfig = DataViewsProviderConfig<
      readonly SchemaFieldDefinition[]
    >;
    expectTypeOf<ProviderConfig>().not.toHaveProperty("capabilities");
    expectTypeOf<ProviderConfig["source"]>().toEqualTypeOf<Source>();
    expectTypeOf<ProviderConfig["location"]>().toEqualTypeOf<
      QueryLocation | undefined
    >();
    // One snapshot is where a provider starts from; there is no seed beside it.
    expectTypeOf<ProviderConfig>().not.toHaveProperty("seed");
    expectTypeOf<ProviderConfig["snapshot"]>().toEqualTypeOf<
      DataViewsSnapshot | undefined
    >();
    expectTypeOf<
      DataViewsProvider["readSnapshot"]
    >().returns.toEqualTypeOf<DataViewsSnapshot>();
    expectTypeOf<Source["readDelivery"]>().toEqualTypeOf<
      ((request: SourceRequest) => SourceDelivery | null) | undefined
    >();
    expectTypeOf<ProviderHost["view"]>().toEqualTypeOf<
      ReadonlyChannel<string | null>
    >();
    // A decode outside any host may pass nothing, or null.
    expectTypeOf<DecodeQueryConfig["capabilities"]>().toEqualTypeOf<
      SourceCapabilities | null | undefined
    >();
    expectTypeOf<
      Omit<DecodeQueryConfig, "capabilities">
    >().toExtend<DecodeQueryConfig>();
  });

  it("takes the collection as the witness, typed by its identity", () => {
    const machines = dataviews.createCollection({
      identify: (machine: Machine) => machine.id,
      fields: [{ field: "cpu", kind: "number" }],
    });
    expectTypeOf(machines).toEqualTypeOf<
      Collection<typeof machines.schema.fields, Machine>
    >();
    expectTypeOf<
      DataViewsProvider<typeof machines.schema.fields, Machine>["collection"]
    >().toEqualTypeOf<typeof machines>();
    expectTypeOf<Collection["types"]>().toEqualTypeOf<RecordTypes | null>();
    expectTypeOf<
      CollectionConfig<typeof machines.schema.fields, Machine>["identify"]
    >().toEqualTypeOf<RowIdentifier<Machine>>();
  });

  it("reports refusals structurally, by part and code", () => {
    expectTypeOf<SourceRefusalPart>().toEqualTypeOf<
      "filter" | "search" | "sort" | "group" | "window" | "targets"
    >();
    expectTypeOf<DataViewsProvider["refusals"]>().returns.toEqualTypeOf<
      readonly SourceRefusal[]
    >();
    // Every count is declared on its own, and claimed on its own.
    expectTypeOf<
      SourceCapabilities["counts"]
    >().toEqualTypeOf<CountCapabilities>();
    expectTypeOf<SourceCounts["pageable"]>().toEqualTypeOf<Count>();
  });

  it("addresses an action's targets explicitly or by query", () => {
    expectTypeOf<ActionTargets>().toEqualTypeOf<
      | { readonly kind: "explicit"; readonly ids: readonly string[] }
      | {
          readonly kind: "query";
          readonly slice: Slice;
          readonly except: readonly string[];
        }
    >();
    expectTypeOf<
      SourceActionRequest["targets"]
    >().toEqualTypeOf<ActionTargets>();
  });

  it("keeps the local-array source's write path on its own handle", () => {
    expectTypeOf<ArraySource>().toExtend<Source>();
    expectTypeOf<ArraySource["setRows"]>().parameters.toEqualTypeOf<
      [readonly RowRecord[]]
    >();
  });

  it("types the adapters' configuration without naming their client's shapes", () => {
    // The observer TanStack Query mints and the environment Relay hands the
    // adapter are matched structurally; an application writes the config
    // and never names the shape the client is held to.
    expectTypeOf<QuerySourceConfig>().toHaveProperty("createObserver");
    expectTypeOf<RelaySourceConfig>().toHaveProperty("environment");
    const surface = listTypeSurface(path.resolve("src/lib/index.ts"));
    expect(
      surface.filter((name) => /^(Relay|Query)/.test(name)).sort(),
    ).toEqual([
      "Query",
      "QueryIssue",
      "QueryIssueCode",
      "QueryLocation",
      "QuerySourceConfig",
      "QueryTransition",
      "RelaySourceConfig",
    ]);
  });
});
