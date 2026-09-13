/**
 * Compile-time contract tests for the package's public type surface.
 *
 * Runtime behavior lives in the sibling test files; this file pins the type
 * exports through the barrel: removing any name from a folder barrel, or
 * changing one of the pinned shapes, fails compilation here.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ActionCapabilities,
  ActionInvocation,
  ActionTargets,
  Applicability,
  AppliedOf,
  AppliedValues,
  ArraySource,
  ArraySourceConfig,
  Channel,
  ChannelConfig,
  ChoicesField,
  CollectionCoordinator,
  CollectionCoordinatorConfig,
  CollectionState,
  ColumnLayout,
  ColumnLayoutState,
  ColumnSizing,
  ColumnToSize,
  Completion,
  Count,
  CountCapabilities,
  CountSupport,
  DataViewsProvider,
  DataViewsProviderConfig,
  DateField,
  DeclaredRecordTypes,
  DecodedQuery,
  DecodeQueryConfig,
  DiscriminatorField,
  DispatchResult,
  DisplayEntriesConfig,
  DisplayEntry,
  DisplayEntryKind,
  EffectiveOrdering,
  EmptyOr,
  EncodeQueryConfig,
  ExecuteSliceConfig,
  FieldFeedback,
  FieldHandle,
  FieldInteraction,
  FieldInteractionConfig,
  FieldInteractionState,
  FieldReader,
  FieldValidation,
  FixedSizing,
  FlagField,
  FlexSizing,
  GridInteraction,
  GridInteractionState,
  GroupCapabilities,
  GroupPath,
  GroupSummary,
  GroupTerm,
  Identity,
  JsonValue,
  Location,
  LocationBinding,
  LocationBindingConfig,
  LocationConfig,
  LocationHost,
  NumberField,
  ObservedQuery,
  Operation,
  OperationConfig,
  OperationFailure,
  OperationOutcome,
  OperationState,
  PageCursors,
  PaginationCapabilities,
  PlatformLocation,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  PreferenceResult,
  PresentationPatch,
  PresentationTarget,
  ProviderFields,
  ProviderViews,
  Query,
  QueryCommand,
  QueryCommandResult,
  QueryIssue,
  QueryObservation,
  QueryObserver,
  QueryObserverFactory,
  QuerySourceConfig,
  ReadonlyChannel,
  RecordTypes,
  RelayConnection,
  RelayEnvironment,
  RelayOperation,
  RelayPageRequest,
  RelaySnapshot,
  RelaySourceConfig,
  ResolvedColumn,
  ResultProblem,
  ResultProvenance,
  ResultState,
  ResultStatus,
  ResultWindow,
  RowEntry,
  RowIdentifier,
  RowModel,
  RowModelConfig,
  RowModelResult,
  RowRecord,
  RowScope,
  RowScopes,
  RowScopesConfig,
  SavedView,
  Schema,
  SchemaFieldDefinition,
  SchemaPredicateResult,
  Selection,
  SelectionState,
  Slice,
  SortCapabilities,
  SortDirection,
  SortTerm,
  SortTiebreak,
  Source,
  SourceActionRequest,
  SourceActionRunner,
  SourceBinding,
  SourceBindingConfig,
  SourceCapabilities,
  SourceCounts,
  SourceDelivery,
  SourceFailure,
  SourceHost,
  SourcePage,
  SourceRefusal,
  SourceRefusalCode,
  SourceRefusalPart,
  SourceRequest,
  TextField,
  UnreadableView,
  ViewAction,
  ViewChanges,
  ViewCreateResult,
  ViewDraft,
  ViewGetResult,
  ViewList,
  ViewOperation,
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
  IndexedDBFactory,
  IndexedDBViewStoreConfig,
} from "./lib/views/index.js";
import type {
  MountedRange,
  MountedRun,
  VirtualRange,
  VirtualRangeConfig,
} from "./lib/virtualization/index.js";

/** A consumer's own row type: an interface, with no index signature. */
type Machine = { readonly id: string; readonly cpu: number };

/** Every type the saved-view entry point exports, as one enumerable tuple. */
type EveryViewsType = [IndexedDBFactory, IndexedDBViewStoreConfig];

/** Every type the package root re-exports, as one enumerable tuple. */
type EveryPublicType = [
  ActionCapabilities,
  ActionInvocation,
  ActionTargets,
  Applicability,
  AppliedOf<FlagField>,
  AppliedValues<readonly SchemaFieldDefinition[]>,
  ArraySource,
  ArraySourceConfig,
  Channel<unknown>,
  ChannelConfig<unknown>,
  ChoicesField,
  CollectionCoordinator,
  CollectionCoordinatorConfig,
  CollectionState,
  ColumnLayout,
  ColumnLayoutState,
  ColumnSizing,
  ColumnToSize,
  Completion,
  Count,
  CountCapabilities,
  CountSupport,
  DataViewsProvider,
  DataViewsProviderConfig<readonly SchemaFieldDefinition[]>,
  DateField,
  DecodedQuery,
  DeclaredRecordTypes,
  DecodeQueryConfig,
  DispatchResult,
  DiscriminatorField<readonly SchemaFieldDefinition[], RowRecord>,
  DisplayEntriesConfig<unknown>,
  DisplayEntry,
  DisplayEntryKind,
  EffectiveOrdering,
  EmptyOr<unknown>,
  EncodeQueryConfig,
  ExecuteSliceConfig,
  FieldFeedback,
  FieldHandle<unknown>,
  FieldInteraction,
  FieldInteractionConfig,
  FieldInteractionState,
  FieldReader,
  FieldValidation,
  FixedSizing,
  FlagField,
  FlexSizing,
  GridInteraction,
  GridInteractionState,
  GroupCapabilities,
  GroupPath,
  GroupSummary,
  GroupTerm,
  Identity,
  JsonValue,
  Location,
  LocationBinding,
  LocationBindingConfig,
  LocationConfig,
  LocationHost,
  NumberField,
  ObservedQuery<SourcePage>,
  Operation,
  OperationConfig,
  OperationFailure,
  OperationOutcome,
  OperationState,
  PageCursors,
  PaginationCapabilities,
  PlatformLocation,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  PreferenceResult,
  PresentationPatch,
  PresentationTarget,
  ProviderFields<readonly SchemaFieldDefinition[]>,
  ProviderViews,
  Query,
  QueryCommand,
  QueryCommandResult,
  QueryIssue,
  QueryObservation<SourcePage>,
  QueryObserver<SourcePage>,
  QueryObserverFactory<SourcePage>,
  QuerySourceConfig,
  ReadonlyChannel<unknown>,
  RecordTypes<readonly SchemaFieldDefinition[], RowRecord>,
  RelayConnection,
  RelayEnvironment,
  RelayOperation,
  RelayPageRequest,
  RelaySnapshot,
  RelaySourceConfig,
  ResolvedColumn,
  ResultProblem,
  ResultProvenance,
  ResultState,
  ResultStatus,
  ResultWindow,
  RowEntry<RowRecord>,
  RowIdentifier<RowRecord>,
  RowModel<RowRecord>,
  RowModelConfig<RowRecord>,
  RowModelResult<RowRecord>,
  RowRecord,
  RowScope<RowRecord>,
  RowScopes<RowRecord>,
  RowScopesConfig<RowRecord>,
  SavedView,
  Schema<readonly SchemaFieldDefinition[]>,
  SchemaFieldDefinition,
  SchemaPredicateResult,
  Selection,
  SelectionState,
  Slice,
  SortCapabilities,
  SortDirection,
  SortTerm,
  SortTiebreak,
  Source,
  SourceActionRequest,
  SourceActionRunner,
  SourceBinding,
  SourceBindingConfig,
  SourceCapabilities,
  SourceCounts,
  SourceDelivery,
  SourceFailure,
  SourceHost,
  SourcePage,
  SourceRefusal,
  SourceRefusalCode,
  SourceRefusalPart,
  SourceRequest,
  TextField,
  UnreadableView,
  ViewAction,
  ViewChanges,
  ViewCreateResult,
  ViewDraft,
  ViewGetResult,
  ViewList,
  ViewOperation,
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

/** Every type name one barrel puts on the surface, following its re-exports. */
const surfaceOf = (barrel: string): string[] => {
  const text = readFileSync(barrel, "utf8");
  const from = (spec: string): string =>
    path.join(path.dirname(barrel), spec.replace(/\.js$/, ".ts"));
  const names: string[] = [];
  for (const [, spec] of text.matchAll(/^export \* from "([^"]+)";/gm)) {
    names.push(...surfaceOf(from(spec)));
  }
  for (const [, spec] of text.matchAll(/^export type \* from "([^"]+)";/gm)) {
    names.push(
      ...[
        ...readFileSync(from(spec), "utf8").matchAll(
          /^export (?:type|interface) (\w+)/gm,
        ),
      ].map(([, name]) => name),
    );
  }
  for (const [, list] of text.matchAll(
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

/** The names this file pins, read from its own import of the barrel. */
const pinned = (): string[] => {
  // Resolved from the package root, which is where the suite runs: the
  // module's own URL is not a file URL in every project this runs under.
  const text = readFileSync(path.resolve("src/index.types.test.ts"), "utf8");
  const block = text.match(/import type \{([^}]*)\} from "\.\/index\.js";/s);
  if (block === null) {
    throw new Error("this file must import its pins from the barrel");
  }
  return block[1]
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
};

describe("public surface types", () => {
  it("re-exports the full type surface from the barrel", () => {
    // The import above is checked by the compiler, so a name that leaves
    // the barrel fails to compile. This is the other direction: a name that
    // *enters* it without a decision, which no type assertion can catch —
    // the tuple's own length only ever compares the list against itself.
    const surface = [
      ...new Set(surfaceOf(path.resolve("src/lib/index.ts"))),
    ].sort();
    expect(surface).toEqual(pinned().sort());
    expectTypeOf<EveryPublicType["length"]>().toEqualTypeOf<153>();
  });

  it("keeps only the saved-view store behind its own entry point", () => {
    expectTypeOf<EveryViewsType>().not.toBeAny();
    expectTypeOf<EveryViewsType["length"]>().toEqualTypeOf<2>();
    // The contract itself is at the root, where types cost no bytes.
    expectTypeOf<
      ViewStore["create"]
    >().returns.resolves.toEqualTypeOf<ViewCreateResult>();
    expectTypeOf<ProviderViews["state"]>().toEqualTypeOf<
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
    // A status entry carries whatever status its renderer defines.
    expectTypeOf<
      Extract<DisplayEntry<"stale">, { readonly kind: "status" }>["status"]
    >().toEqualTypeOf<"stale">();
  });

  it("exports the identity functions with the declared shapes", () => {
    expectTypeOf(dataviews.createIdentity).returns.toEqualTypeOf<Identity>();
    expectTypeOf(dataviews.isIdentity).parameter(0).toEqualTypeOf<unknown>();
  });

  it("narrows unknown values to Identity", () => {
    const value: unknown = undefined;
    if (dataviews.isIdentity(value)) {
      expectTypeOf(value).toEqualTypeOf<Identity>();
    }
  });

  it("keeps Identity opaque to structural construction", () => {
    expectTypeOf<Record<string, never>>().not.toExtend<Identity>();
    expectTypeOf<object>().not.toExtend<Identity>();
  });

  it("re-exports the query grammar types from the barrel", () => {
    expectTypeOf(dataviews.canonicalSlice).parameter(0).toEqualTypeOf<Slice>();
    expectTypeOf(dataviews.sliceEquals).parameters.toEqualTypeOf<
      [Slice, Slice]
    >();
    expectTypeOf<Query>().toEqualTypeOf<{
      readonly slice: Slice;
      readonly window: ResultWindow;
    }>();
    // Paging never addresses collapse; `setCollapsed` alone does.
    expectTypeOf<WindowNavigation>().toEqualTypeOf<
      Partial<Omit<ResultWindow, "collapsed">>
    >();
  });

  it("re-exports the machine handle types from the barrel", () => {
    expectTypeOf(
      dataviews.createFieldInteraction,
    ).returns.toEqualTypeOf<FieldInteraction>();
    expectTypeOf(dataviews.createOperation).returns.toEqualTypeOf<Operation>();
    expectTypeOf(
      dataviews.createCollectionCoordinator<RowRecord>,
    ).returns.toEqualTypeOf<CollectionCoordinator>();
    expectTypeOf(dataviews.createRowModel<RowRecord>).parameters.toEqualTypeOf<
      [RowModelConfig<RowRecord>]
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

  it("discriminates the command, completion and outcome unions by status", () => {
    expectTypeOf<QueryCommand["kind"]>().toEqualTypeOf<
      | "setPredicate"
      | "removePredicate"
      | "setSearch"
      | "setSort"
      | "setGroup"
      | "setCollapsed"
      | "navigateWindow"
    >();
    expectTypeOf<Completion["status"]>().toEqualTypeOf<
      "succeeded" | "failed" | "refused"
    >();
    expectTypeOf<ResultStatus>().toEqualTypeOf<
      | "idle"
      | "pending"
      | "refreshing"
      | "ready"
      | "refreshFailed"
      | "stale"
      | "failed"
    >();
    expectTypeOf<OperationState["status"]>().toEqualTypeOf<
      "pending" | "partial" | "succeeded" | "failed"
    >();
    // Feedback discriminates on status, as every other union here does.
    expectTypeOf<FieldFeedback["status"]>().toEqualTypeOf<
      "none" | "applied" | "incomplete" | "invalid"
    >();
    expectTypeOf<FieldInteractionState>()
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
    type Machines = AppliedValues<typeof machines.fields>;
    expectTypeOf<Machines["status"]>().toEqualTypeOf<
      ReadonlySet<"failed" | "cancelled">
    >();
    expectTypeOf<Machines["cpu"]>().toEqualTypeOf<number>();
    expectTypeOf<Machines["owner"]>().toEqualTypeOf<boolean>();
  });

  it("takes the provider's bounded commands one object at a time", () => {
    expectTypeOf<
      DataViewsProvider["navigateWindow"]
    >().parameters.toEqualTypeOf<[WindowNavigation]>();
    expectTypeOf<DataViewsProvider["adopt"]>().parameters.toEqualTypeOf<
      [Query]
    >();
    expectTypeOf<DataViewsProvider["invokeAction"]>().parameters.toEqualTypeOf<
      [ActionInvocation]
    >();
    expectTypeOf<DataViewsProvider["setGroup"]>().parameters.toEqualTypeOf<
      [readonly GroupTerm[]]
    >();
    expectTypeOf<DataViewsProvider["setCollapsed"]>().parameters.toEqualTypeOf<
      [readonly GroupPath[]]
    >();
    expectTypeOf<DataViewsProvider<readonly SchemaFieldDefinition[], Machine>>()
      .toHaveProperty("state")
      .toEqualTypeOf<ReadonlyChannel<CollectionState<Machine>>>();
  });

  it("accepts the provider as a source host without a cast", () => {
    expectTypeOf<DataViewsProvider>().toExtend<SourceHost>();
    // Including a provider built for a real record type: the host and the
    // source agree on it rather than on the default record shape.
    expectTypeOf<
      DataViewsProvider<readonly SchemaFieldDefinition[], Machine>
    >().toExtend<SourceHost<Machine>>();
    expectTypeOf<SourceHost<Machine>["complete"]>().parameters.toEqualTypeOf<
      [string, Completion<Machine>]
    >();
  });

  it("carries the source's declaration, or null, on every host", () => {
    // Required everywhere a host is: an optional one would be undefined
    // too, and a host could drop the declaration without a word.
    expectTypeOf<
      DataViewsProvider["capabilities"]
    >().toEqualTypeOf<SourceCapabilities | null>();
    expectTypeOf<
      SourceHost["capabilities"]
    >().toEqualTypeOf<SourceCapabilities | null>();
    expectTypeOf<
      LocationHost["capabilities"]
    >().toEqualTypeOf<SourceCapabilities | null>();
  });

  it("takes a declaration in, and hands the source's back, by shape", () => {
    // Given once, to the provider; absent means not told, so the key is
    // optional and not nullable.
    type ProviderConfig = DataViewsProviderConfig<
      readonly SchemaFieldDefinition[]
    >;
    expectTypeOf<ProviderConfig["capabilities"]>().toEqualTypeOf<
      SourceCapabilities | undefined
    >();
    expectTypeOf<
      Omit<ProviderConfig, "capabilities">
    >().toExtend<ProviderConfig>();
    // A decode outside any host may pass nothing, or null.
    expectTypeOf<DecodeQueryConfig["capabilities"]>().toEqualTypeOf<
      SourceCapabilities | null | undefined
    >();
    expectTypeOf<
      Omit<DecodeQueryConfig, "capabilities">
    >().toExtend<DecodeQueryConfig>();
    // The binding hands back the source's own declaration, always present.
    expectTypeOf<
      SourceBinding["capabilities"]
    >().toEqualTypeOf<SourceCapabilities>();
  });

  it("accepts the provider as a location host without a cast", () => {
    expectTypeOf<DataViewsProvider>().toExtend<LocationHost>();
    // Including a provider built for a real record type: the host reads the
    // snapshot channel and never publishes on it, so its record type is the
    // widest one rather than an invariant pin on the default.
    expectTypeOf<
      DataViewsProvider<readonly SchemaFieldDefinition[], Machine>
    >().toExtend<LocationHost>();
    expectTypeOf<Parameters<LocationHost["adopt"]>>().toEqualTypeOf<[Query]>();
  });

  it("reports refusals structurally, by part and code", () => {
    expectTypeOf<SourceRefusalPart>().toEqualTypeOf<
      "filter" | "search" | "sort" | "group" | "window" | "targets"
    >();
    expectTypeOf(dataviews.supportsRequest).returns.toEqualTypeOf<
      readonly SourceRefusal[]
    >();
    // Every count is declared on its own, and claimed on its own.
    expectTypeOf<
      SourceCapabilities["counts"]
    >().toEqualTypeOf<CountCapabilities>();
    expectTypeOf<SourceCounts["visible"]>().toEqualTypeOf<Count>();
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
});
