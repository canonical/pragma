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
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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

/**
 * The binding returned by useDataViewsField.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type UseDataViewsFieldResult<TApplied> = {
  /** The text in the field's input, as last edited. */
  readonly input: string;
  /** The field's applied semantic value, or empty when no predicate stands. */
  readonly applied: EmptyOr<TApplied>;
  /** What the control shows beside its input: applied, incomplete or why invalid. */
  readonly feedback: FieldFeedback;
  /** Edit through the text input; an invalid edit keeps the standing predicate. */
  readonly edit: (input: string) => void;
  /** Set the semantic operands directly, as a multi-value control does. */
  readonly set: (operands: readonly PredicateOperand[]) => void;
  /** Remove the field's predicate, distinct from an empty edit. */
  readonly clear: () => void;
};

/**
 * The cell scope returned by useDataViewsCell. Its channels are read-only.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type UseDataViewsCellResult = {
  /** The identity of the row the cell displays. */
  readonly rowId: string;
  /** The id of the column the cell renders. */
  readonly columnId: string;
  /** The whole record; watching it is broader than watching one field. */
  readonly row: ReadonlyChannel<unknown>;
  /** One channel per field the table observes, keyed by field name. */
  readonly fields: Readonly<Record<string, ReadonlyChannel<unknown>>>;
  /** Whether the row is in the collection's selection. */
  readonly selected: ReadonlyChannel<boolean>;
};
