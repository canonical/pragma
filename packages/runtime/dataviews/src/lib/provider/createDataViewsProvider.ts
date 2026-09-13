import {
  type CollectionCoordinator,
  type CollectionState,
  createCollectionCoordinator,
} from "../collection/index.js";
import {
  createFieldInteraction,
  type FieldInteractionState,
} from "../field/index.js";
import { createIdentity } from "../identity/index.js";
import { type Channel, createChannel } from "../observable/index.js";
import { type ActionInvocation, createOperation } from "../operation/index.js";
import {
  addressPredicate,
  canonicalizeSlice,
  type GroupPath,
  type GroupTerm,
  type Predicate,
  type PredicateOperand,
  type PredicateOperator,
  type Query,
  type SortTerm,
  type WindowNavigation,
} from "../query/index.js";
import type { Completion } from "../result/index.js";
import {
  type Applicability,
  createRowModel,
  EMPTY_ROW_MODEL,
  type RowModel,
  type RowRecord,
} from "../rows/index.js";
import {
  type EmptyOr,
  resolveFieldKind,
  type SchemaFieldDefinition,
} from "../schema/index.js";
import { createSelection } from "../selection/index.js";
import { copyCapabilities } from "../source/index.js";
import { createProviderViews } from "../views/index.js";
import createRecordTyping from "./createRecordTyping.js";
import type {
  DataViewsProvider,
  DataViewsProviderConfig,
  FieldHandle,
} from "./types.js";

/** One field record with its address, for re-syncing after external changes. */
type AddressedRecord = {
  readonly field: string;
  readonly operator: PredicateOperator;
  readonly interaction: ReturnType<typeof createFieldInteraction>;
  /** The writable side, kept here so the handle can publish read-only. */
  readonly state: Channel<FieldInteractionState>;
  readonly applied: Channel<EmptyOr<unknown>>;
  /** The applied value a predicate of this field carries. */
  readonly appliedOf: (predicate: Predicate | null) => EmptyOr<unknown>;
  readonly handle: FieldHandle<unknown>;
};

/**
 * Create the DataViews provider: the one owner assembling core state for a
 * collection — the request-lifecycle coordinator, selection, and one field
 * interaction record per field and legal operator — with observation
 * channels published at mutation boundaries.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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
    for (const predicate of canonicalizeSlice(coordinator.state.slice).filter) {
      applied.set(
        addressPredicate(predicate.field, predicate.operator),
        predicate,
      );
    }
    return applied;
  };

  const buildFieldRecord = (
    definition: SchemaFieldDefinition,
    operator: PredicateOperator,
  ): AddressedRecord => {
    const { field } = definition;
    const kind = resolveFieldKind(definition.kind);
    /** The applied value a predicate carries, through the field's kind. */
    const appliedOf = (predicate: Predicate | null): EmptyOr<unknown> =>
      predicate === null
        ? { kind: "empty" }
        : { kind: "value", value: kind.readApplied(predicate) };
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
      {
        equals: (a, b) =>
          a.kind === "empty" || b.kind === "empty"
            ? a.kind === b.kind
            : kind.areAppliedEqual(a.value, b.value),
      },
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
        applied.set(appliedOf(interaction.state.applied));
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
        applied.set(appliedOf(built.predicate));
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
      appliedOf,
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
      const record = buildFieldRecord(definition, operator);
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
        applied.get(addressPredicate(record.field, record.operator)) ?? null;
      record.interaction.setApplied(predicate);
      record.state.set(record.interaction.state);
      record.applied.set(record.appliedOf(predicate));
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
      // and displayed. Those rows then report `refresh-failed`, or `stale`
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
