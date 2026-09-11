import type {
  CollectionCoordinatorState,
  CompletionResult,
} from "../collection/createCollectionCoordinator.js";
import type { Identity } from "../createIdentity.js";
import type { FieldInteractionState } from "../field/createFieldInteraction.js";
import type { Channel } from "../observable/createChannel.js";
import type { Operation } from "../operation/createOperation.js";
import type {
  PredicateOperand,
  ResultWindow,
  Slice,
  SortTerm,
} from "../query/types.js";
import type { RowModel, RowRecord } from "../rows/types.js";
import type { Schema } from "../schema/createSchema.js";
import type {
  AppliedOf,
  EmptyOr,
  SchemaFieldDefinition,
} from "../schema/types.js";
import type { Selection } from "../selection/createSelection.js";
import type { SourceCapabilities } from "../source/types.js";
import type { ProviderViews } from "../views/types.js";

/** One field handle of a provider: observation plus bounded edits. */
export type ProviderFieldHandle<TApplied> = {
  /** The field's interaction state channel (buffer and feedback). */
  readonly state: Channel<FieldInteractionState>;
  /** The field's applied semantic value channel. */
  readonly applied: Channel<EmptyOr<TApplied>>;
  /** Edit through the text buffer; invalid edits retain the predicate. */
  readonly edit: (buffer: string) => void;
  /** Set the semantic operands directly (multi-value controls). */
  readonly set: (operands: readonly PredicateOperand[]) => void;
  /** Explicitly remove the field's predicate. */
  readonly clear: () => void;
};

/** The provider's field handles, keyed by field and its legal operators. */
export type ProviderFields<TFields extends readonly SchemaFieldDefinition[]> = {
  readonly [TDefinition in TFields[number] as TDefinition["field"]]: TDefinition extends {
    readonly kind: "choices";
  }
    ? { readonly eq: ProviderFieldHandle<AppliedOf<TDefinition>> }
    : TDefinition extends { readonly kind: "number" | "date" }
      ? {
          readonly gte: ProviderFieldHandle<AppliedOf<TDefinition>>;
          readonly lte: ProviderFieldHandle<AppliedOf<TDefinition>>;
        }
      : TDefinition extends { readonly kind: "flag" }
        ? { readonly isSet: ProviderFieldHandle<AppliedOf<TDefinition>> }
        : never;
};

/** The provider: the one owner assembling core state for a collection. */
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
  /** The coordinator's snapshot channel (result, query and window). */
  readonly result: Channel<CollectionCoordinatorState<TRow>>;
  /**
   * The displayed rows as one shared model: stable identities in result
   * order. Every root and every table on this provider reads the same model,
   * so no cell owns a duplicate record.
   */
  readonly rows: Channel<RowModel<TRow>>;
  readonly selection: Selection;
  /**
   * The collection's saved views over the store the provider was given, or
   * null when it was given none: no store means no views, never views kept
   * in memory and lost on reload.
   */
  readonly views: ProviderViews | null;
  readonly fields: ProviderFields<TFields>;
  /** Bounded commands, not raw dispatch: */
  readonly navigateWindow: (page?: number, size?: number) => void;
  readonly setSort: (sort: readonly SortTerm[]) => void;
  readonly setSearch: (search: string) => void;
  readonly refresh: () => string | null;
  /** Adopt externally authoritative query/window state (back/forward). */
  readonly adopt: (slice: Slice, window: ResultWindow) => string | null;
  /** Adapter-facing request completion. */
  readonly complete: (
    requestId: string,
    result: CompletionResult<TRow>,
  ) => boolean;
  /** Invoke an operation with immutable captured targets. */
  readonly invokeAction: (
    targets: readonly string[],
    payload?: unknown,
  ) => Operation;
  /** Rotate to a fresh scope: query/window/result/selection all reset. */
  readonly rotateScope: () => void;
  /** Detach permanently: subscriptions and pending requests die. */
  readonly dispose: () => void;
};
