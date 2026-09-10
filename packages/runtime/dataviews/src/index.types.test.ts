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
  DispatchResult,
  EmptyOr,
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
  LocationConfig,
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
  QueryObservation,
  QueryObserver,
  QueryObserverFactory,
  QuerySourceConfig,
  ReadonlyChannel,
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
  DispatchResult,
  EmptyOr<unknown>,
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
  LocationConfig,
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
    expectTypeOf<EveryPublicType["length"]>().toEqualTypeOf<91>();
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
    expectTypeOf<Record<string, never>>().not.toMatchTypeOf<Identity>();
    expectTypeOf<object>().not.toMatchTypeOf<Identity>();
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
    expectTypeOf<DataViewsProvider>().toMatchTypeOf<SourceHost>();
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
    expectTypeOf<ArraySource>().toMatchTypeOf<SourceAdapter>();
    expectTypeOf<ArraySource["setRows"]>().parameters.toEqualTypeOf<
      [readonly RowRecord[]]
    >();
  });
});
