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
  ActionInvocation,
  ActionTargets,
  Applicability,
  AppliedOf,
  ArraySource,
  ArraySourceConfig,
  CapabilityDeclaration,
  ChoicesField,
  CollectionState,
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
  EmptyOr,
  EncodeQueryConfig,
  FieldFeedback,
  FieldHandle,
  FieldInteractionState,
  FieldKind,
  FieldValidation,
  FlagField,
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
  Operation,
  OperationFailure,
  OperationOutcome,
  OperationState,
  PageConfig,
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
  QueryIssue,
  QuerySourceConfig,
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
  ColumnLayout,
  ColumnLayoutState,
  ColumnSizing,
  ColumnToSize,
  DisplayEntriesConfig,
  DisplayEntry,
  DisplayEntryKind,
  FixedSizing,
  FlexSizing,
  GridInteraction,
  GridInteractionState,
  ResolvedColumn,
  RowScope,
  RowScopes,
  RowScopesConfig,
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
  ActionInvocation,
  ActionTargets,
  Applicability,
  AppliedOf<FlagField>,
  ArraySource,
  ArraySourceConfig,
  CapabilityDeclaration<readonly SchemaFieldDefinition[]>,
  ChoicesField,
  CollectionState,
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
  EmptyOr<unknown>,
  EncodeQueryConfig,
  FieldFeedback,
  FieldHandle<unknown>,
  FieldInteractionState,
  FieldKind,
  FieldValidation,
  FlagField,
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
  Operation,
  OperationFailure,
  OperationOutcome,
  OperationState,
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
  ProviderFields<readonly SchemaFieldDefinition[]>,
  ProviderViews,
  Query,
  QueryIssue,
  QuerySourceConfig,
  ReadonlyChannel<unknown>,
  RecordTypes<readonly SchemaFieldDefinition[], RowRecord>,
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

/** Every type the binding entry point exports, as one enumerable tuple. */
type EveryBindingType = [
  ColumnLayout,
  ColumnLayoutState,
  ColumnSizing,
  ColumnToSize,
  DisplayEntriesConfig<unknown>,
  DisplayEntry,
  DisplayEntryKind,
  FixedSizing,
  FlexSizing,
  GridInteraction,
  GridInteractionState,
  ResolvedColumn,
  RowScope<RowRecord>,
  RowScopes<RowRecord>,
  RowScopesConfig<RowRecord>,
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
    // factories, the slice algebra, and the request check.
    for (const owned of [
      "createCollectionCoordinator",
      "createFieldInteraction",
      "createOperation",
      "createRowModel",
      "createSelection",
      "applyWindow",
      "areSortsEqual",
      "collapseSortTerms",
      "executeSlice",
      "refusalsOf",
      "readField",
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

  it("exports the identity check with the declared shape", () => {
    expectTypeOf(bindings.isIdentity).parameter(0).toEqualTypeOf<unknown>();
  });

  it("narrows unknown values to Identity", () => {
    const value: unknown = undefined;
    if (bindings.isIdentity(value)) {
      expectTypeOf(value).toEqualTypeOf<Identity>();
    }
  });

  it("keeps Identity opaque to structural construction", () => {
    expectTypeOf<Record<string, never>>().not.toExtend<Identity>();
    expectTypeOf<object>().not.toExtend<Identity>();
  });

  it("exports the query grammar with the slice comparison on ./bindings", () => {
    expectTypeOf(bindings.areSlicesEqual).parameters.toEqualTypeOf<
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
    type Machines = ProviderFields<typeof machines.fields>;
    expectTypeOf<Machines["status"]["eq"]["applied"]>().toEqualTypeOf<
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
    expectTypeOf<SourceBinding["refusals"]>().returns.toEqualTypeOf<
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
      "QuerySourceConfig",
      "RelaySourceConfig",
    ]);
  });
});
