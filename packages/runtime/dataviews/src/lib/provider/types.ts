import type { CollectionState } from "../collection/createCollectionCoordinator.js";
import type { Identity } from "../createIdentity.js";
import type { FieldInteractionState } from "../field/createFieldInteraction.js";
import type { ReadonlyChannel } from "../observable/createChannel.js";
import type {
  ActionInvocation,
  Operation,
} from "../operation/createOperation.js";
import type {
  GroupPath,
  GroupTerm,
  PredicateOperand,
  Query,
  SortTerm,
  WindowNavigation,
} from "../query/types.js";
import type { Completion } from "../result/types.js";
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

/** One filter address on a provider: observation plus bounded edits. */
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

/** The provider's field handles, keyed by field and its legal operators. */
export type ProviderFields<TFields extends readonly SchemaFieldDefinition[]> = {
  readonly [TDefinition in TFields[number] as TDefinition["field"]]: TDefinition extends {
    readonly kind: "choices";
  }
    ? { readonly eq: FieldHandle<AppliedOf<TDefinition>> }
    : TDefinition extends { readonly kind: "number" | "date" }
      ? {
          readonly gte: FieldHandle<AppliedOf<TDefinition>>;
          readonly lte: FieldHandle<AppliedOf<TDefinition>>;
        }
      : TDefinition extends { readonly kind: "flag" }
        ? { readonly isSet: FieldHandle<AppliedOf<TDefinition>> }
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
  /** Bounded commands, not raw dispatch: */
  readonly navigateWindow: (window: WindowNavigation) => void;
  readonly setSort: (sort: readonly SortTerm[]) => void;
  readonly setSearch: (search: string) => void;
  /**
   * Replace the grouping levels.
   *
   * Seam for the grouping unit: reserved, and refused while no source
   * declares a groupable field.
   */
  readonly setGroup: (group: readonly GroupTerm[]) => void;
  /**
   * Replace the collapsed group paths.
   *
   * Seam for the grouping unit: reserved, and refused while no source
   * honours collapse.
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
