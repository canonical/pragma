import type {
  CollectionCoordinator,
  CollectionState,
} from "../collection/createCollectionCoordinator.js";
import createCollectionCoordinator from "../collection/createCollectionCoordinator.js";
import createIdentity from "../createIdentity.js";
import type { FieldInteractionState } from "../field/createFieldInteraction.js";
import createFieldInteraction from "../field/createFieldInteraction.js";
import type { Channel } from "../observable/createChannel.js";
import createChannel from "../observable/createChannel.js";
import type { ActionInvocation } from "../operation/createOperation.js";
import createOperation from "../operation/createOperation.js";
import canonicalSlice, { predicateAddress } from "../query/canonicalSlice.js";
import type {
  GroupPath,
  GroupTerm,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  Query,
  ResultWindow,
  Slice,
  SortTerm,
  WindowNavigation,
} from "../query/types.js";
import type { Completion } from "../result/types.js";
import createRowModel from "../rows/createRowModel.js";
import EMPTY_ROW_MODEL from "../rows/emptyRowModel.js";
import type {
  Applicability,
  RowIdentifier,
  RowModel,
  RowRecord,
} from "../rows/types.js";
import type { Schema } from "../schema/createSchema.js";
import type { EmptyOr, SchemaFieldDefinition } from "../schema/types.js";
import createSelection from "../selection/createSelection.js";
import copyCapabilities from "../source/copyCapabilities.js";
import type { SourceCapabilities } from "../source/types.js";
import createProviderViews from "../views/createProviderViews.js";
import type { ViewStore } from "../views/types.js";
import createRecordTyping from "./createRecordTyping.js";
import type { DataViewsProvider, FieldHandle, RecordTypes } from "./types.js";

/**
 * Derive the applied semantic value of one field's predicate. The operator
 * decides it, not the kind: a set of options, the presence a flag states, or
 * the single bound of a range.
 */
const deriveAppliedValue = (
  operator: PredicateOperator,
  predicate: Predicate | null,
): EmptyOr<unknown> => {
  if (predicate === null) {
    return { kind: "empty" };
  }
  switch (operator) {
    case "eq":
      return { kind: "value", value: new Set(predicate.operands) };
    case "isSet":
      return { kind: "value", value: true };
    case "gte":
    case "lte":
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
   * source's own `capabilities`. Connected parts, and DataTable's sortable
   * columns, offer only what is declared, and a location clause outside it
   * is refused.
   */
  readonly capabilities?: SourceCapabilities;
  /**
   * Where the collection's saved views and presentation preferences live —
   * `createIndexedDBViewStore` from `@canonical/dataviews-core/views`, or a
   * store of the application's own. Left out, the collection has no views.
   */
  readonly views?: ViewStore;
  /**
   * How this collection's records declare their type: one `choices` field of
   * the schema, carried by every row. Left out, the collection is
   * monomorphic — no memory is kept, no row is read for a type, and nothing
   * else here behaves differently. A field scoped to record types is then
   * inert, since there is only the one type for it to apply to.
   */
  readonly types?: RecordTypes<TFields, TRow>;
};

/** One field record with its address, for re-syncing after external changes. */
type AddressedRecord = {
  readonly field: string;
  readonly operator: PredicateOperator;
  readonly interaction: ReturnType<typeof createFieldInteraction>;
  /** The writable side, kept here so the handle can publish read-only. */
  readonly state: Channel<FieldInteractionState>;
  readonly applied: Channel<EmptyOr<unknown>>;
  readonly handle: FieldHandle<unknown>;
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
  const state = createChannel<CollectionState<TRow>>(coordinator.state, {
    equals: (a, b) => a === b,
  });
  const rows = createChannel<RowModel<TRow>>(EMPTY_ROW_MODEL);
  const recordTyping =
    config.types === undefined
      ? null
      : createRecordTyping<TFields, TRow>({
          schema,
          field: config.types.field,
          selection,
          rows,
        });

  const publishState = (): void => {
    state.set(coordinator.state);
  };

  const dispatchCommand = (
    command: Parameters<CollectionCoordinator["dispatch"]>[0],
  ): void => {
    const outcome = coordinator.dispatch(command);
    if (outcome.status === "accepted" && outcome.requestId !== null) {
      publishState();
    }
  };

  /**
   * Every applied predicate by its address. Built once per sync: the slice
   * is the same one for every field, and canonicalizing it per field would
   * rebuild it once for each address the schema offers.
   */
  const appliedByAddress = (): Map<string, Predicate> => {
    const applied = new Map<string, Predicate>();
    for (const predicate of canonicalSlice(coordinator.state.slice).filter) {
      applied.set(
        predicateAddress(predicate.field, predicate.operator),
        predicate,
      );
    }
    return applied;
  };

  const buildFieldRecord = (
    field: string,
    operator: PredicateOperator,
  ): AddressedRecord => {
    const interaction = createFieldInteraction({
      field,
      operator,
      validate: (input) => schema.validateInput(field, input),
      format: (predicate) =>
        predicate === null ? "" : String(predicate.operands[0] ?? ""),
    });
    const stateChannel = createChannel<FieldInteractionState>(
      interaction.state,
    );
    const applied = createChannel<EmptyOr<unknown>>(
      { kind: "empty" },
      { equals: emptyOrEqual },
    );

    const handle: FieldHandle<unknown> = {
      state: stateChannel,
      applied,
      edit(input: string): void {
        const command = interaction.edit(input);
        if (command !== null) {
          dispatchCommand(command);
        }
        stateChannel.set(interaction.state);
        applied.set(deriveAppliedValue(operator, interaction.state.applied));
      },
      set(operands: readonly PredicateOperand[]): void {
        const built = schema.predicateFor(field, operator, operands);
        if (built.status !== "valid") {
          return;
        }
        dispatchCommand({
          kind: "setPredicate",
          predicate: built.predicate,
        });
        interaction.setApplied(built.predicate);
        applied.set(deriveAppliedValue(operator, built.predicate));
        stateChannel.set(interaction.state);
      },
      clear(): void {
        const command = interaction.clear();
        dispatchCommand(command);
        applied.set({ kind: "empty" });
        stateChannel.set(interaction.state);
      },
    };
    return {
      field,
      operator,
      interaction,
      state: stateChannel,
      applied,
      handle,
    };
  };

  const fieldRecords: AddressedRecord[] = [];
  const fields: Record<string, Record<string, FieldHandle<unknown>>> = {};
  for (const definition of schema.fields) {
    const operators = schema.listOperators(definition.field);
    if (operators.length === 0) {
      continue;
    }
    const byOperator: Record<string, FieldHandle<unknown>> = {};
    for (const operator of operators) {
      const record = buildFieldRecord(definition.field, operator);
      fieldRecords.push(record);
      byOperator[operator] = record.handle;
    }
    fields[definition.field] = byOperator;
  }

  /** Re-sync every field's applied mirror from the coordinator's slice. */
  const syncFields = (): void => {
    const applied = appliedByAddress();
    for (const record of fieldRecords) {
      const predicate =
        applied.get(predicateAddress(record.field, record.operator)) ?? null;
      record.interaction.setApplied(predicate);
      record.state.set(record.interaction.state);
      record.applied.set(deriveAppliedValue(record.operator, predicate));
    }
  };

  const capabilities =
    config.capabilities === undefined
      ? null
      : copyCapabilities(config.capabilities);

  const adopt = (query: Query): string | null => {
    const requestId = coordinator.adopt(query);
    // External authority wins: sync every field's applied mirror.
    syncFields();
    if (requestId !== null) {
      publishState();
    }
    return requestId;
  };

  const views =
    config.views === undefined
      ? null
      : createProviderViews({
          host: { schema, capabilities, state, adopt },
          store: config.views,
        });

  const dispose = (): void => {
    views?.dispose();
    coordinator.dispose();
    publishState();
  };

  return {
    identity,
    schema,
    capabilities,
    state,
    rows,
    selection,
    views,
    // Built by walking `schema.fields`, so it holds exactly the schema's
    // own literal keys and their operators; the map type is what the walk
    // can say, and this is what the walk in fact produced.
    fields: fields as DataViewsProvider<TFields>["fields"],
    types: recordTyping?.declared ?? null,
    applicability(field: string, row: TRow): Applicability {
      return recordTyping?.applicability(field, row) ?? "applies";
    },
    recordType(id: string): string | null {
      return recordTyping?.recordType(id) ?? null;
    },
    navigateWindow(window: WindowNavigation): void {
      dispatchCommand({ kind: "navigateWindow", ...window });
    },
    setSort(sort: readonly SortTerm[]): void {
      dispatchCommand({ kind: "setSort", sort });
    },
    setSearch(search: string): void {
      dispatchCommand({ kind: "setSearch", search });
    },
    setGroup(group: readonly GroupTerm[]): void {
      dispatchCommand({ kind: "setGroup", group });
    },
    setCollapsed(collapsed: readonly GroupPath[]): void {
      dispatchCommand({ kind: "setCollapsed", collapsed });
    },
    refresh(): string | null {
      const requestId = coordinator.refresh();
      if (requestId !== null) {
        publishState();
      }
      return requestId;
    },
    adopt,
    complete(requestId: string, completion: Completion<TRow>): boolean {
      // Only the pending request can publish: nothing is built for another,
      // such as a source's later delivery of a request already settled.
      if (coordinator.state.pendingRequestId !== requestId) {
        return false;
      }
      // The model is built before the coordinator publishes, so rows with
      // an ambiguous identity, or with a type the schema does not declare,
      // fail the request instead of replacing rows that can still be keyed
      // and displayed. Those rows then report `refreshFailed`, or `stale`
      // once the query has moved on from the one they answer.
      let model: RowModel<TRow> | null = null;
      let rejection: string | null = null;
      if (completion.status === "succeeded") {
        const built = createRowModel({
          rows: completion.page.rows,
          identify,
          previous: rows.get(),
        });
        // A model handed back whole was checked when it was accepted and
        // holds the same records still, so there is nothing to read again
        // and nothing about to leave the display.
        if (built.status === "built" && built.model !== rows.get()) {
          rejection = recordTyping?.rejectionOf(built.model) ?? null;
          model = rejection === null ? built.model : null;
        } else if (built.status === "rejected") {
          rejection = built.reason;
        }
      }
      const reported: Completion<TRow> =
        rejection === null
          ? completion
          : {
              status: "failed",
              failure: {
                reason: rejection,
                // Retrying the same request delivers the same rows.
                transient: false,
                // No library raised anything: the rows themselves are wrong.
                cause: null,
              },
            };
      const published = coordinator.complete(requestId, reported);
      if (published) {
        if (model !== null) {
          // The outgoing model is the last one these rows were displayed
          // in, so the memory is taken from it before it is let go.
          recordTyping?.remember(rows.get());
          rows.set(model);
        }
        publishState();
      }
      return published;
    },
    invokeAction(invocation: ActionInvocation) {
      return createOperation({
        targets: invocation.targets,
        payload: invocation.payload,
        selectionRevision: selection.state.get().revision,
      });
    },
    rotateScope(): void {
      coordinator.rotateScope();
      rows.set(EMPTY_ROW_MODEL);
      selection.clear();
      recordTyping?.forget();
      views?.forget();
      syncFields();
      publishState();
    },
    dispose,
  };
}
