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
  Channel,
  ChannelConfig,
  ChoicesField,
  CollectionCoordinator,
  CollectionCoordinatorConfig,
  CollectionCoordinatorState,
  CompletionResult,
  DateField,
  DispatchResult,
  FieldFeedback,
  FieldInteraction,
  FieldInteractionConfig,
  FieldInteractionState,
  FieldValidation,
  FlagField,
  Identity,
  NumberField,
  Operation,
  OperationConfig,
  OperationFailure,
  OperationOutcome,
  OperationState,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  QueryCommand,
  QueryCommandResult,
  ResultProvenance,
  ResultState,
  ResultStatus,
  ResultWindow,
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
  CompletionResult,
  DateField,
  DispatchResult,
  FieldFeedback,
  FieldInteraction,
  FieldInteractionConfig,
  FieldInteractionState,
  FieldValidation,
  FlagField,
  Identity,
  NumberField,
  Operation,
  OperationConfig,
  OperationFailure,
  OperationOutcome,
  OperationState,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  QueryCommand,
  QueryCommandResult,
  ResultProvenance,
  ResultState,
  ResultStatus,
  ResultWindow,
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
];

describe("public surface types", () => {
  it("re-exports the full type surface from the barrel", () => {
    expectTypeOf<EveryPublicType>().not.toBeAny();
    expectTypeOf<EveryPublicType["length"]>().toEqualTypeOf<44>();
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
      dataviews.createCollectionCoordinator,
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
});
