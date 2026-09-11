/**
 * Compile-time contract tests for the package's public type surface.
 *
 * Runtime behavior lives in the sibling test files; this file pins the type
 * exports through the barrel: removing any name from a folder barrel, or
 * changing one of the pinned shapes, fails compilation here.
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  AppliedOf,
  ArraySource,
  ArraySourceConfig,
  Channel,
  ChannelConfig,
  ChoicesField,
  CollectionCoordinator,
  CollectionCoordinatorConfig,
  CollectionCoordinatorState,
  ColumnPreview,
  ColumnSizing,
  ColumnToSize,
  CompletionResult,
  DataViewsProvider,
  DataViewsProviderConfig,
  DateField,
  DecodedQuery,
  DecodeQueryConfig,
  DispatchResult,
  DisplayEntriesConfig,
  DisplayEntry,
  DisplayEntryKind,
  EmptyOr,
  EncodeQueryConfig,
  ExecuteSliceOptions,
  FieldFeedback,
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
  Identity,
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
  PlatformLocation,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  Presentation,
  PresentationState,
  ProviderFieldHandle,
  ProviderFields,
  QueryCommand,
  QueryCommandResult,
  QueryIssue,
  QueryObservation,
  QueryObserver,
  QueryObserverFactory,
  QuerySourceConfig,
  ReadonlyChannel,
  RelayConnection,
  RelayEnvironment,
  RelayOperation,
  RelayPageRequest,
  RelaySnapshot,
  RelaySourceConfig,
  ResolvedColumn,
  ResultProvenance,
  ResultState,
  ResultStatus,
  ResultWindow,
  RowEntry,
  RowIdentifier,
  RowModel,
  RowRecord,
  RowScope,
  RowScopes,
  RowScopesConfig,
  SaveSession,
  SaveSessionConfig,
  SaveSessionState,
  Schema,
  SchemaFieldDefinition,
  SchemaFields,
  SchemaPredicateResult,
  Selection,
  SelectionState,
  Slice,
  SortDirection,
  SortTerm,
  SourceActionRequest,
  SourceActionRunner,
  SourceAdapter,
  SourceBinding,
  SourceBindingConfig,
  SourceCapabilities,
  SourceHost,
  SourcePage,
  SourceRefusal,
  SourceRefusalPart,
  SourceRequest,
  SourceSupport,
} from "./index.js";
import * as dataviews from "./index.js";
import type {
  IndexedDBFactory,
  IndexedDBViewStoreConfig,
  JsonValue,
  PreferenceResult,
  PresentationPatch,
  PresentationTarget,
  SavedView,
  UnreadableView,
  ViewChanges,
  ViewCreateResult,
  ViewDraft,
  ViewGetResult,
  ViewList,
  ViewPresentation,
  ViewRemoveResult,
  ViewRevision,
  ViewStore,
  ViewUpdateResult,
} from "./lib/views/index.js";
import type {
  MountedRange,
  MountedRun,
  VirtualRange,
  VirtualRangeConfig,
} from "./lib/virtualization/index.js";

/** Every type the saved-view entry point exports, as one enumerable tuple. */
type EveryViewsType = [
  IndexedDBFactory,
  IndexedDBViewStoreConfig,
  JsonValue,
  PreferenceResult,
  PresentationPatch,
  PresentationTarget,
  SavedView,
  UnreadableView,
  ViewChanges,
  ViewCreateResult,
  ViewDraft,
  ViewGetResult,
  ViewList,
  ViewPresentation,
  ViewRemoveResult,
  ViewRevision,
  ViewStore,
  ViewUpdateResult,
];

/** Every type the package root re-exports, as one enumerable tuple. */
type EveryPublicType = [
  AppliedOf<FlagField>,
  Channel<unknown>,
  ChannelConfig<unknown>,
  ChoicesField,
  CollectionCoordinator,
  CollectionCoordinatorConfig,
  CollectionCoordinatorState,
  ColumnPreview,
  ColumnSizing,
  ColumnToSize,
  CompletionResult,
  DataViewsProvider,
  DataViewsProviderConfig<readonly SchemaFieldDefinition[]>,
  DateField,
  DecodedQuery,
  DecodeQueryConfig,
  DisplayEntriesConfig<unknown>,
  DisplayEntry,
  DisplayEntryKind,
  DispatchResult,
  EmptyOr<unknown>,
  EncodeQueryConfig,
  FieldFeedback,
  FieldInteraction,
  FieldInteractionConfig,
  FieldInteractionState,
  FieldValidation,
  FixedSizing,
  FlagField,
  FlexSizing,
  GridInteraction,
  GridInteractionState,
  Identity,
  Location,
  LocationBinding,
  LocationBindingConfig,
  LocationConfig,
  LocationHost,
  NumberField,
  Operation,
  OperationConfig,
  OperationFailure,
  OperationOutcome,
  OperationState,
  PlatformLocation,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  Presentation,
  PresentationState,
  ProviderFieldHandle<unknown>,
  ProviderFields<readonly SchemaFieldDefinition[]>,
  QueryCommand,
  QueryCommandResult,
  QueryIssue,
  ReadonlyChannel<unknown>,
  ResolvedColumn,
  ResultProvenance,
  ResultState,
  ResultStatus,
  ResultWindow,
  RowEntry<RowRecord>,
  RowIdentifier<RowRecord>,
  RowModel<RowRecord>,
  RowRecord,
  RowScope<RowRecord>,
  RowScopes<RowRecord>,
  RowScopesConfig<RowRecord>,
  SaveSession<unknown>,
  SaveSessionConfig<unknown>,
  SaveSessionState<unknown>,
  Schema<readonly SchemaFieldDefinition[]>,
  SchemaFieldDefinition,
  SchemaFields<readonly SchemaFieldDefinition[]>,
  SchemaPredicateResult,
  Selection,
  SelectionState,
  Slice,
  SortDirection,
  SortTerm,
  ArraySource,
  ArraySourceConfig,
  ExecuteSliceOptions,
  FieldReader,
  ObservedQuery<SourcePage>,
  QueryObservation<SourcePage>,
  QueryObserver<SourcePage>,
  QueryObserverFactory<SourcePage>,
  QuerySourceConfig,
  RelayConnection,
  RelayEnvironment,
  RelayOperation,
  RelayPageRequest,
  RelaySnapshot,
  RelaySourceConfig,
  SourceActionRequest,
  SourceActionRunner,
  SourceAdapter,
  SourceBinding,
  SourceBindingConfig,
  SourceCapabilities,
  SourceHost,
  SourcePage,
  SourceRefusal,
  SourceRefusalPart,
  SourceRequest,
  SourceSupport,
];

describe("public surface types", () => {
  it("re-exports the full type surface from the barrel", () => {
    expectTypeOf<EveryPublicType>().not.toBeAny();
    expectTypeOf<EveryPublicType["length"]>().toEqualTypeOf<107>();
  });

  it("exports the saved-view types from their own entry point", () => {
    expectTypeOf<EveryViewsType>().not.toBeAny();
    expectTypeOf<EveryViewsType["length"]>().toEqualTypeOf<18>();
    expectTypeOf<
      ViewStore["create"]
    >().returns.resolves.toEqualTypeOf<ViewCreateResult>();
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
  });

  it("re-exports the machine handle types from the barrel", () => {
    expectTypeOf(
      dataviews.createFieldInteraction,
    ).returns.toEqualTypeOf<FieldInteraction>();
    expectTypeOf(dataviews.createOperation).returns.toEqualTypeOf<Operation>();
    expectTypeOf(
      dataviews.createCollectionCoordinator<RowRecord>,
    ).returns.toEqualTypeOf<CollectionCoordinator>();
    expectTypeOf(
      dataviews.createSaveSession<{ density: string }>,
    ).returns.toEqualTypeOf<SaveSession<{ density: string }>>();
  });

  it("discriminates command and completion unions by status or kind", () => {
    expectTypeOf<QueryCommand["kind"]>().toEqualTypeOf<
      | "replacePredicate"
      | "removePredicate"
      | "replaceSearch"
      | "replaceSort"
      | "setGroup"
      | "navigateWindow"
    >();
    expectTypeOf<CompletionResult["status"]>().toEqualTypeOf<
      "success" | "failure"
    >();
    expectTypeOf<ResultWindow["page"]>().toEqualTypeOf<number>();
  });

  it("infers applied types from one schema construction", () => {
    const machines = dataviews.createSchema([
      { field: "status", kind: "choices", options: ["failed", "cancelled"] },
      { field: "cpu", kind: "number" },
      { field: "owner", kind: "flag" },
    ]);
    type Machines = SchemaFields<typeof machines.fields>;
    expectTypeOf<Machines["status"]>().toEqualTypeOf<
      ReadonlySet<"failed" | "cancelled">
    >();
    expectTypeOf<Machines["cpu"]>().toEqualTypeOf<number>();
    expectTypeOf<Machines["owner"]>().toEqualTypeOf<boolean>();
  });

  it("accepts the provider as a source host without a cast", () => {
    expectTypeOf<DataViewsProvider>().toExtend<SourceHost>();
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

  it("takes a declaration in, and hands the adapter's back, by shape", () => {
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
    // The binding hands back the adapter's own declaration, always present.
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
      DataViewsProvider<
        readonly SchemaFieldDefinition[],
        { readonly id: string }
      >
    >().toExtend<LocationHost>();
    expectTypeOf<Parameters<LocationHost["adopt"]>>().toEqualTypeOf<
      [Slice, ResultWindow]
    >();
  });

  it("discriminates source support and refusals by status and part", () => {
    expectTypeOf<SourceSupport["status"]>().toEqualTypeOf<
      "supported" | "unsupported"
    >();
    expectTypeOf<SourceRefusalPart>().toEqualTypeOf<
      "filter" | "search" | "sort" | "group"
    >();
    expectTypeOf<SourceCapabilities["count"]>().toEqualTypeOf<
      "filtered" | "none"
    >();
  });

  it("keeps the local-array source's write path on its own handle", () => {
    expectTypeOf<ArraySource>().toExtend<SourceAdapter>();
    expectTypeOf<ArraySource["setRows"]>().parameters.toEqualTypeOf<
      [readonly RowRecord[]]
    >();
  });
});
