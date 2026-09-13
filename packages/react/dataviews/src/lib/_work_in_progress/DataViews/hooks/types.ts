/**
 * Hook domain types for the DataViews domain: every hook's result, and the
 * props of the one hook that takes a config object. The witness hooks and
 * the value hook take their one input positionally — the collection, a
 * channel, a handle — so they declare no props type of their own.
 */
import type {
  DataViewsProvider,
  EmptyOr,
  FilterFeedback,
  FilterHandles,
  PredicateOperand,
  ReadonlyChannel,
  RowRecord,
  SchemaFieldDefinition,
  SourceRefusal,
} from "@canonical/dataviews-core";
import type { ContextOptions, DataViewsProps } from "../types.js";

/**
 * What the root's state hook takes: the root's props less its children,
 * which the root renders itself.
 */
export type UseProviderStateProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = Omit<DataViewsProps<TFields, TRow>, "children">;

/** What the root's state hook hands the context: the root's value. */
export type UseProviderStateResult = ContextOptions;

/** What a connected part reads off the enclosing root: its value. */
export type UseDataViewsRootResult = ContextOptions;

/** What `useDataViewsValue` returns: the channel's current value. */
export type UseDataViewsValueResult<T> = T;

/**
 * The typed collection scope returned by useDataViews: the provider's own
 * members a child of a root may read and command, plus the root's filter
 * handles. Derived, so a signature is written once; `observe` and `reset`
 * are left out, because the root observes for every child and a child that
 * reset the collection would be resetting every other child's too.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type UseDataViewsResult<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = Pick<
  DataViewsProvider<TFields, TRow>,
  | "collection"
  | "capabilities"
  | "state"
  | "rows"
  | "issues"
  | "selection"
  | "views"
  | "navigateWindow"
  | "setSort"
  | "setSearch"
  | "setGroup"
  | "setCollapsed"
  | "refresh"
  | "refusals"
  | "runAction"
> & {
  /** This root's filter handles, one per field and legal operator. */
  readonly filters: FilterHandles<TFields>;
};

/**
 * What `useDataViewsFilter` returns: one filter of the root, read and edited.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type UseDataViewsFilterResult<TApplied> = {
  /** The text in the filter's input, as last edited. */
  readonly input: string;
  /** The filter's applied semantic value, or empty when no predicate stands. */
  readonly applied: EmptyOr<TApplied>;
  /** What the control shows beside its input: applied, incomplete, or why not. */
  readonly feedback: FilterFeedback;
  /** Edit through the text input; an edit that cannot apply keeps the standing predicate. */
  readonly edit: (input: string) => void;
  /** Set the semantic operands directly, as a multi-value control does. */
  readonly set: (
    operands: readonly PredicateOperand[],
  ) => readonly SourceRefusal[];
  /** Remove the filter's predicate, distinct from an empty edit. */
  readonly clear: () => readonly SourceRefusal[];
};

/** What `useFilterHandle` returns: one filter handle, read and edited. */
export type UseFilterHandleResult<TApplied> =
  UseDataViewsFilterResult<TApplied>;

/**
 * The cell scope returned by useDataViewsCell. Its channels are read-only.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type UseDataViewsCellResult<TRow extends object = RowRecord> = {
  /** The identity of the row the cell displays. */
  readonly rowId: string;
  /** The id of the column the cell renders. */
  readonly columnId: string;
  /** The whole record; watching it is broader than watching one field. */
  readonly record: ReadonlyChannel<TRow>;
  /** One channel per field the table observes, keyed by field name. */
  readonly fields: Readonly<Record<string, ReadonlyChannel<unknown>>>;
  /** Whether the row is in the collection's selection. */
  readonly selected: ReadonlyChannel<boolean>;
};
