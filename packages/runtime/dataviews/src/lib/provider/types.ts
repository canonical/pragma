/**
 * The provider's contract: the configuration it is built from, the handle
 * it hands out, and the field handles and record types it publishes on it.
 */

import type { CollectionState } from "../collection/index.js";
import type { FieldInteractionState } from "../field/index.js";
import type { Identity } from "../identity/index.js";
import type { ReadonlyChannel } from "../observable/index.js";
import type { ActionInvocation, Operation } from "../operation/index.js";
import type {
  GroupPath,
  GroupTerm,
  PredicateOperand,
  Query,
  ResultWindow,
  Slice,
  SortTerm,
  WindowNavigation,
} from "../query/index.js";
import type { Completion } from "../result/index.js";
import type {
  Applicability,
  RowIdentifier,
  RowModel,
  RowRecord,
} from "../rows/index.js";
import type {
  AppliedOf,
  EmptyOr,
  FieldKind,
  FieldKindOperators,
  Schema,
  SchemaFieldDefinition,
  TextField,
} from "../schema/index.js";
import type { Selection } from "../selection/index.js";
import type { SourceCapabilities } from "../source/index.js";
import type { ProviderViews, ViewStore } from "../views/index.js";

/**
 * One filter address on a provider: observation plus bounded edits.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FieldHandle<TApplied> = {
  /** The field's interaction state: its input and its feedback. */
  readonly state: ReadonlyChannel<FieldInteractionState>;
  /** The field's applied semantic value. */
  readonly applied: ReadonlyChannel<EmptyOr<TApplied>>;
  /** Edit through the text input; invalid edits retain the predicate. */
  readonly edit: (input: string) => void;
  /** Set the semantic operands directly (multi-value controls). */
  readonly set: (operands: readonly PredicateOperand[]) => void;
  /** Explicitly remove the field's predicate. */
  readonly clear: () => void;
};

/**
 * One field's handles, keyed by the operators the field kind table declares
 * for its kind. Written as a conditional so the kind resolves to its
 * literal before the operators are looked up.
 */
type FieldHandles<TDefinition extends SchemaFieldDefinition> =
  TDefinition extends { readonly kind: infer TKind extends FieldKind }
    ? {
        readonly [TOperator in FieldKindOperators[TKind]]: FieldHandle<
          AppliedOf<TDefinition>
        >;
      }
    : never;

/**
 * The provider's field handles, keyed by field and its legal operators —
 * the operators the field kind table declares for the field's kind.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ProviderFields<TFields extends readonly SchemaFieldDefinition[]> = {
  // A text field accepts no operator, so it has no handle to address.
  readonly [TDefinition in Exclude<
    TFields[number],
    TextField
  > as TDefinition["field"]]: FieldHandles<TDefinition>;
};

/** Whether a row's value at one key can carry a field's options. */
type CarriesOptions<TRow, TName, TOption> = TName extends keyof TRow
  ? // The default row shape says nothing about its values, so it carries any.
    unknown extends TRow[TName]
    ? true
    : // A key the row may not have carries no type, and such a row fails
      // every completion: this is the case the check exists to catch.
      undefined extends TRow[TName]
      ? false
      : [TRow[TName]] extends [TOption]
        ? true
        : // An adapter typing the key as the wider `string` carries them too.
          [TOption] extends [TRow[TName]]
          ? true
          : false
  : false;

/**
 * The schema fields that may declare a collection's record types: a
 * `choices` field with string options, carried by the row at the same key
 * with a value its options and the row agree on.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DiscriminatorField<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  [TDefinition in TFields[number] as TDefinition["field"]]: TDefinition extends {
    readonly kind: "choices";
    readonly options: infer TOptions extends readonly string[];
  }
    ? CarriesOptions<TRow, TDefinition["field"], TOptions[number]> extends true
      ? TDefinition["field"]
      : never
    : never;
}[TFields[number]["field"]] &
  /* The mapped type answers with field names, which the compiler cannot see
     through an unresolved `TFields`; this says so. */
  string;

/**
 * How a collection's records declare their type: one field of the schema,
 * carried by every row. A source whose backend sends no such field writes it
 * when it builds its rows. A row carrying a value outside the field's options
 * fails the completion; it is never displayed.
 *
 * Declaring none makes the collection monomorphic, and nothing here applies.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type RecordTypes<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  readonly field: DiscriminatorField<TFields, TRow>;
};

/**
 * A collection's record types as the provider publishes them.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DeclaredRecordTypes = {
  /** The schema field every row carries its type in. */
  readonly field: string;
  /** Every type name the field declares, in declaration order. */
  readonly names: readonly string[];
};

/**
 * The provider: the one owner assembling core state for a collection.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsProvider<
  TFields extends
    readonly SchemaFieldDefinition[] = readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  /** The provider's referential scope identity. */
  readonly identity: Identity;
  readonly schema: Schema<TFields>;
  /**
   * What the collection's source declares it can execute, or null when the
   * provider was not told. Connected parts, and DataTable's sortable
   * columns, offer only what is declared.
   */
  readonly capabilities: SourceCapabilities | null;
  /**
   * The collection's snapshot: query, window, result and pending request,
   * published at every mutation boundary.
   */
  readonly state: ReadonlyChannel<CollectionState<TRow>>;
  /**
   * The displayed rows as one shared model: stable identities in result
   * order. Every root and every table on this provider reads the same model,
   * so no cell owns a duplicate record.
   */
  readonly rows: ReadonlyChannel<RowModel<TRow>>;
  readonly selection: Selection;
  /**
   * The collection's saved views over the store the provider was given, or
   * null when it was given none: no store means no views, never views kept
   * in memory and lost on reload.
   */
  readonly views: ProviderViews | null;
  readonly fields: ProviderFields<TFields>;
  /**
   * The collection's record types, or null when it declares none and is
   * therefore monomorphic. A column's scope is narrower than the
   * collection's — it is the `types` of that column's own schema field.
   *
   * @seam actions — read by `useDataViewsAction`, for an action's own types
   */
  readonly types: DeclaredRecordTypes | null;
  /**
   * Whether a schema field applies to a row, by the field's type scoping.
   * Always "applies" on a monomorphic collection, and on a field the schema
   * does not scope.
   *
   * @seam typed cells — read by the body cell, whose not-applicable cell is
   * the third state beside value and empty
   */
  readonly applicability: (field: string, row: TRow) => Applicability;
  /**
   * The type remembered for a selected identity, or null when the provider
   * never modelled it while it was selected — a selection restored by a host
   * over rows this provider has not seen. A remembered type is let go when
   * the rows are next replaced after its identity leaves the selection, so
   * one reselected before then answers as before. It answers from the row on
   * display whenever there is one, so it never contradicts `applicability`,
   * and it changes only with a `rows` or a `selection` publication: watching
   * those is watching this.
   *
   * @seam actions — read by `useDataViewsAction`, which decides an action's
   * applicability to records selected on an earlier page from here
   */
  readonly recordType: (id: string) => string | null;
  /** Bounded commands, not raw dispatch: */
  readonly navigateWindow: (window: WindowNavigation) => void;
  readonly setSort: (sort: readonly SortTerm[]) => void;
  readonly setSearch: (search: string) => void;
  /**
   * Replace the grouping levels. Reserved: refused while no source declares
   * a groupable field.
   *
   * @seam grouping — read by the group header row
   */
  readonly setGroup: (group: readonly GroupTerm[]) => void;
  /**
   * Replace the collapsed group paths. Reserved: refused while no source
   * honours collapse.
   *
   * @seam grouping — read by the group header's disclosure
   */
  readonly setCollapsed: (collapsed: readonly GroupPath[]) => void;
  readonly refresh: () => string | null;
  /** Invoke an operation with immutable captured targets. */
  readonly invokeAction: (invocation: ActionInvocation) => Operation;
  /** Adopt an externally authoritative query (back/forward, a saved view). */
  readonly adopt: (query: Query) => string | null;
  /** Source-facing request completion. */
  readonly complete: (
    requestId: string,
    completion: Completion<TRow>,
  ) => boolean;
  /** Rotate to a fresh scope: query/window/result/selection all reset. */
  readonly rotateScope: () => void;
  /** Detach permanently: subscriptions and pending requests die. */
  readonly dispose: () => void;
};

/**
 * Configuration of one DataViews provider.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsProviderConfig<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  readonly schema: Schema<TFields>;
  readonly slice?: Slice | undefined;
  readonly window?: ResultWindow | undefined;
  /**
   * Reads one record's stable identity. Defaults to the record's own `id`,
   * which must then be a non-empty string.
   */
  readonly identify?: RowIdentifier<TRow> | undefined;
  /**
   * What the source bound to this provider declares it can execute — the
   * source's own `capabilities`. Connected parts, and DataTable's sortable
   * columns, offer only what is declared, and a location clause outside it
   * is refused.
   */
  readonly capabilities?: SourceCapabilities | undefined;
  /**
   * Where the collection's saved views and presentation preferences live —
   * `createIndexedDBViewStore` from `@canonical/dataviews-core/indexeddb`, or a
   * store of the application's own. Left out, the collection has no views.
   */
  readonly views?: ViewStore | undefined;
  /**
   * How this collection's records declare their type: one `choices` field of
   * the schema, carried by every row. Left out, the collection is
   * monomorphic — no memory is kept, no row is read for a type, and nothing
   * else here behaves differently. A field scoped to record types is then
   * inert, since there is only the one type for it to apply to.
   */
  readonly types?: RecordTypes<TFields, TRow> | undefined;
};

/** Configuration of one collection's record typing. */
export type RecordTypingConfig<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  readonly schema: Schema<TFields>;
  /** The discriminator: the schema field every row carries its type in. */
  readonly field: string;
  /** The selection whose identities are the ones worth remembering. */
  readonly selection: Selection;
  /** The displayed rows, read for a type the memory has not taken yet. */
  readonly rows: ReadonlyChannel<RowModel<TRow>>;
};

/** One collection's record typing: what the provider answers about types. */
export type RecordTyping<TRow extends object = RowRecord> = {
  /** The discriminator and its type names, as the provider publishes them. */
  readonly declared: DeclaredRecordTypes;
  /** Why a model cannot be displayed, or null when every row is typed. */
  readonly rejectionOf: (model: RowModel<TRow>) => string | null;
  /** Whether a schema field applies to a row. */
  readonly applicability: (field: string, row: TRow) => Applicability;
  /** The remembered type of a selected identity. */
  readonly recordType: (id: string) => string | null;
  /** Take the type of every selected row of a model about to be replaced. */
  readonly remember: (model: RowModel<TRow>) => void;
  /** Drop the memory: the scope rotated, so nothing displayed survives. */
  readonly forget: () => void;
};
