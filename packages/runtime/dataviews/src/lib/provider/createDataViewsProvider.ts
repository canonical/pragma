import type {
  CollectionCoordinator,
  CollectionCoordinatorState,
  CompletionResult,
} from "../collection/createCollectionCoordinator.js";
import createCollectionCoordinator from "../collection/createCollectionCoordinator.js";
import createIdentity from "../createIdentity.js";
import type { FieldInteractionState } from "../field/createFieldInteraction.js";
import createFieldInteraction from "../field/createFieldInteraction.js";
import createChannel from "../observable/createChannel.js";
import createOperation from "../operation/createOperation.js";
import canonicalSlice from "../query/canonicalSlice.js";
import type {
  Predicate,
  PredicateOperand,
  PredicateOperator,
  ResultWindow,
  Slice,
  SortTerm,
} from "../query/types.js";
import createRowModel from "../rows/createRowModel.js";
import type { RowIdentifier, RowModel, RowRecord } from "../rows/types.js";
import type { Schema } from "../schema/createSchema.js";
import type { EmptyOr, SchemaFieldDefinition } from "../schema/types.js";
import createSelection from "../selection/createSelection.js";
import copyCapabilities from "../source/copyCapabilities.js";
import type { SourceCapabilities } from "../source/types.js";
import type { DataViewsProvider, ProviderFieldHandle } from "./types.js";

/** The legal operators of a field kind, in display order. */
const operatorsFor = (
  kind: SchemaFieldDefinition["kind"],
): readonly PredicateOperator[] => {
  switch (kind) {
    case "choices":
      return ["eq"];
    case "number":
    case "date":
      return ["gte", "lte"];
    case "flag":
      return ["isSet"];
  }
};

/** Derive the applied semantic value of one field's predicate. */
const appliedValueOf = (
  definition: SchemaFieldDefinition,
  predicate: Predicate | null,
): EmptyOr<unknown> => {
  if (predicate === null) {
    return { kind: "empty" };
  }
  switch (definition.kind) {
    case "choices":
      return { kind: "value", value: new Set(predicate.operands) };
    case "flag":
      return { kind: "value", value: true };
    case "number":
    case "date":
      return { kind: "value", value: predicate.operands[0] };
  }
};

/** Structural equality over EmptyOr values, with set membership for sets. */
const emptyOrEqual = <T>(a: EmptyOr<T>, b: EmptyOr<T>): boolean => {
  if (a.kind === "empty" || b.kind === "empty") {
    return a.kind === b.kind;
  }
  const aValue = a.value;
  const bValue = b.value;
  if (aValue instanceof Set && bValue instanceof Set) {
    if (aValue.size !== bValue.size) {
      return false;
    }
    for (const entry of aValue) {
      if (!bValue.has(entry)) {
        return false;
      }
    }
    return true;
  }
  return aValue === bValue;
};

/** Configuration of one DataViews provider. */
export type DataViewsProviderConfig<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  readonly schema: Schema<TFields>;
  readonly slice?: Slice;
  readonly window?: ResultWindow;
  /**
   * Reads one record's stable identity. Defaults to the record's own `id`,
   * which must then be a non-empty string.
   */
  readonly identify?: RowIdentifier<TRow>;
  /**
   * What the source bound to this provider declares it can execute — the
   * adapter's own `capabilities`. Connected parts, and DataTable's sortable
   * columns, offer only what is declared, and a location clause outside it
   * is refused.
   */
  readonly capabilities?: SourceCapabilities;
};

/** One field record with its address, for re-syncing after external changes. */
type AddressedRecord = {
  readonly field: string;
  readonly operator: PredicateOperator;
  readonly definition: SchemaFieldDefinition;
  readonly interaction: ReturnType<typeof createFieldInteraction>;
  readonly handle: ProviderFieldHandle<unknown>;
};

/**
 * Create the DataViews provider: the one owner assembling core state for a
 * collection — the request-lifecycle coordinator, selection, and one field
 * interaction record per field and legal operator — with observation
 * channels published at mutation boundaries.
 */
export default function createDataViewsProvider<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(
  config: DataViewsProviderConfig<TFields, TRow>,
): DataViewsProvider<TFields, TRow> {
  const { schema, identify } = config;
  const identity = createIdentity();
  const coordinator = createCollectionCoordinator<TRow>({
    slice: config.slice,
    window: config.window,
  });
  const selection = createSelection();
  const result = createChannel<CollectionCoordinatorState<TRow>>(
    coordinator.state,
    { equals: (a, b) => a === b },
  );
  const emptyRows = createRowModel<TRow>([], identify);
  const rows = createChannel<RowModel<TRow>>(emptyRows);

  const publishResult = (): void => {
    result.set(coordinator.state);
  };

  const dispatchCommand = (
    command: Parameters<CollectionCoordinator["dispatch"]>[0],
  ): void => {
    const outcome = coordinator.dispatch(command);
    if (outcome.status === "accepted" && outcome.requestId !== null) {
      publishResult();
    }
  };

  const appliedOf = (
    field: string,
    operator: PredicateOperator,
  ): Predicate | null => {
    const canonical = canonicalSlice(coordinator.state.slice);
    for (const predicate of canonical.filter) {
      if (predicate.field === field && predicate.operator === operator) {
        return predicate;
      }
    }
    return null;
  };

  const buildFieldRecord = (
    definition: SchemaFieldDefinition,
    operator: PredicateOperator,
  ): AddressedRecord => {
    const interaction = createFieldInteraction({
      field: definition.field,
      operator,
      validate: (buffer) => schema.validateBuffer(definition.field, buffer),
      format: (predicate) =>
        predicate === null ? "" : String(predicate.operands[0] ?? ""),
    });
    const state = createChannel<FieldInteractionState>(interaction.state);
    const applied = createChannel<EmptyOr<unknown>>(
      { kind: "empty" },
      { equals: emptyOrEqual },
    );

    const handle: ProviderFieldHandle<unknown> = {
      state,
      applied,
      edit(buffer: string): void {
        const command = interaction.edit(buffer);
        if (command !== null) {
          dispatchCommand(command);
        }
        state.set(interaction.state);
        applied.set(appliedValueOf(definition, interaction.state.applied));
      },
      set(operands: readonly PredicateOperand[]): void {
        const built = schema.predicateFor(definition.field, operator, operands);
        if (built.status !== "valid") {
          return;
        }
        dispatchCommand({
          kind: "replacePredicate",
          predicate: built.predicate,
        });
        interaction.setApplied(built.predicate);
        applied.set(appliedValueOf(definition, built.predicate));
        state.set(interaction.state);
      },
      clear(): void {
        const command = interaction.clear();
        dispatchCommand(command);
        applied.set({ kind: "empty" });
        state.set(interaction.state);
      },
    };
    return {
      field: definition.field,
      operator,
      definition,
      interaction,
      handle,
    };
  };

  const fieldRecords: AddressedRecord[] = [];
  const fields = {} as Record<
    string,
    Record<string, ProviderFieldHandle<unknown>>
  >;
  for (const definition of schema.fields) {
    const byOperator: Record<string, ProviderFieldHandle<unknown>> = {};
    for (const operator of operatorsFor(definition.kind)) {
      const record = buildFieldRecord(definition, operator);
      fieldRecords.push(record);
      byOperator[operator] = record.handle;
    }
    fields[definition.field] = byOperator;
  }

  /** Re-sync every field's applied mirror from the coordinator's slice. */
  const syncFields = (): void => {
    for (const record of fieldRecords) {
      const predicate = appliedOf(record.field, record.operator);
      record.interaction.setApplied(predicate);
      record.handle.state.set(record.interaction.state);
      record.handle.applied.set(appliedValueOf(record.definition, predicate));
    }
  };

  const dispose = (): void => {
    coordinator.dispose();
    publishResult();
  };

  return {
    identity,
    schema,
    capabilities:
      config.capabilities === undefined
        ? null
        : copyCapabilities(config.capabilities),
    result,
    rows,
    selection,
    fields: fields as DataViewsProvider<TFields>["fields"],
    navigateWindow(page?: number, size?: number): void {
      dispatchCommand({ kind: "navigateWindow", page, size });
    },
    setSort(sort: readonly SortTerm[]): void {
      dispatchCommand({ kind: "replaceSort", sort });
    },
    setSearch(search: string): void {
      dispatchCommand({ kind: "replaceSearch", search });
    },
    refresh(): string | null {
      const requestId = coordinator.refresh();
      if (requestId !== null) {
        publishResult();
      }
      return requestId;
    },
    adopt(slice: Slice, window: ResultWindow): string | null {
      const requestId = coordinator.adopt(slice, window);
      // External authority wins: sync every field's applied mirror.
      syncFields();
      if (requestId !== null) {
        publishResult();
      }
      return requestId;
    },
    complete(requestId: string, completion: CompletionResult<TRow>): boolean {
      // Only the pending request can publish: nothing is built for another,
      // such as a source's later delivery of a request already settled.
      if (coordinator.state.pendingRequestId !== requestId) {
        return false;
      }
      // The model is built before the coordinator publishes, so a record
      // with an ambiguous identity rejects the whole completion instead of
      // leaving displayed rows the table cannot key.
      const model =
        completion.status === "success"
          ? createRowModel(completion.rows, identify, rows.get())
          : null;
      const published = coordinator.complete(requestId, completion);
      if (published) {
        if (model !== null) {
          rows.set(model);
        }
        publishResult();
      }
      return published;
    },
    invokeAction(targets: readonly string[], payload?: unknown) {
      return createOperation({
        targets,
        payload,
        selectionRevision: selection.state.revision,
      });
    },
    rotateScope(): void {
      coordinator.rotateScope();
      rows.set(emptyRows);
      selection.clear();
      syncFields();
      publishResult();
    },
    dispose,
  };
}
