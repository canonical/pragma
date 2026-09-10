/**
 * Hook domain types for the DataViews domain. Each hook declares its result
 * type here; hook props types live beside them when a hook takes config.
 */
import type {
  Channel,
  CollectionCoordinatorState,
  EmptyOr,
  FieldFeedback,
  Operation,
  PredicateOperand,
  ProviderFields,
  ReadonlyChannel,
  ResultWindow,
  RowModel,
  RowRecord,
  SchemaFieldDefinition,
  Selection,
  Slice,
  SortTerm,
} from "@canonical/dataviews-core";

/**
 * A core record publishing its own immutable state. `Selection`,
 * `Presentation` and `GridInteraction` expose a `state` getter and a
 * `subscribe` rather than a channel, so `useDataViewsState` observes them
 * through this shape while channels go through `useDataViewsValue`.
 */
export type StateRecord<T> = {
  readonly state: T;
  readonly subscribe: (listener: () => void) => () => void;
};

/** The typed collection scope returned by useDataViews. */
export type UseDataViewsResult<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  /** The coordinator snapshot channel (result, query and window). */
  readonly result: Channel<CollectionCoordinatorState<TRow>>;
  /** The displayed rows as one shared model, keyed by stable identity. */
  readonly rows: Channel<RowModel<TRow>>;
  readonly selection: Selection;
  readonly fields: ProviderFields<TFields>;
  readonly navigateWindow: (page?: number, size?: number) => void;
  readonly setSort: (sort: readonly SortTerm[]) => void;
  readonly setSearch: (search: string) => void;
  readonly refresh: () => string | null;
  readonly adopt: (slice: Slice, window: ResultWindow) => string | null;
  readonly invokeAction: (
    targets: readonly string[],
    payload?: unknown,
  ) => Operation;
};

/** The binding returned by useDataViewsField. */
export type UseDataViewsFieldResult<TApplied> = {
  readonly input: string;
  readonly applied: EmptyOr<TApplied>;
  readonly feedback: FieldFeedback;
  readonly edit: (buffer: string) => void;
  readonly set: (operands: readonly PredicateOperand[]) => void;
  readonly clear: () => void;
};

/** The cell scope returned by useDataViewsCell. Its channels are read-only. */
export type UseDataViewsCellResult = {
  readonly rowId: string;
  readonly columnId: string;
  readonly row: ReadonlyChannel<unknown>;
  readonly fields: Readonly<Record<string, ReadonlyChannel<unknown>>>;
  readonly selected: ReadonlyChannel<boolean>;
};
