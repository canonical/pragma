/**
 * Hook domain types for the DataViews domain. Each hook declares its result
 * type here; hook props types live beside them when a hook takes config.
 */
import type {
  DataViewsProvider,
  EmptyOr,
  FieldFeedback,
  PredicateOperand,
  ReadonlyChannel,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";

/**
 * The typed collection scope returned by useDataViews: the provider's own
 * members a child of a root may read and command, and nothing else.
 * Derived, so a signature is written once; `adopt`, `complete`,
 * `rotateScope` and `dispose` are left out, because a child that imposed a
 * query or completed a request would be fighting the location binding and
 * the source binding for authority they already hold.
 */
export type UseDataViewsResult<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = Pick<
  DataViewsProvider<TFields, TRow>,
  | "identity"
  | "schema"
  | "capabilities"
  | "state"
  | "rows"
  | "selection"
  | "views"
  | "fields"
  | "navigateWindow"
  | "setSort"
  | "setSearch"
  | "setGroup"
  | "setCollapsed"
  | "refresh"
  | "invokeAction"
>;

/** The binding returned by useDataViewsField. */
export type UseDataViewsFieldResult<TApplied> = {
  readonly input: string;
  readonly applied: EmptyOr<TApplied>;
  readonly feedback: FieldFeedback;
  readonly edit: (input: string) => void;
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
