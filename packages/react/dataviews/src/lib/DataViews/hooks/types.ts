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
  ResultWindow,
  SchemaFieldDefinition,
  Selection,
  Slice,
  SortTerm,
} from "@canonical/dataviews-core";

/** The typed collection scope returned by useDataViews. */
export type UseDataViewsResult<
  TFields extends readonly SchemaFieldDefinition[],
> = {
  /** The coordinator snapshot channel (result, query and window). */
  readonly result: Channel<CollectionCoordinatorState>;
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

/** The cell scope returned by useDataViewsCell. */
export type UseDataViewsCellResult = {
  readonly rowId: string;
  readonly columnId: string;
  readonly row: Channel<unknown>;
  readonly fields: Readonly<Record<string, Channel<unknown>>>;
  readonly selected: Channel<boolean>;
};
