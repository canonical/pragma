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
import type { Schema } from "../schema/createSchema.js";
import type {
  AppliedOf,
  EmptyOr,
  SchemaFieldDefinition,
} from "../schema/types.js";
import type { Selection } from "../selection/createSelection.js";

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
> = {
  /** The provider's referential scope identity. */
  readonly identity: Identity;
  readonly schema: Schema<TFields>;
  /** The coordinator's snapshot channel (result, query and window). */
  readonly result: Channel<CollectionCoordinatorState>;
  readonly selection: Selection;
  readonly fields: ProviderFields<TFields>;
  /** Bounded commands, not raw dispatch: */
  readonly navigateWindow: (page?: number, size?: number) => void;
  readonly setSort: (sort: readonly SortTerm[]) => void;
  readonly setSearch: (search: string) => void;
  readonly refresh: () => string | null;
  /** Adopt externally authoritative query/window state (back/forward). */
  readonly adopt: (slice: Slice, window: ResultWindow) => string | null;
  /** Adapter-facing request completion. */
  readonly complete: (requestId: string, result: CompletionResult) => boolean;
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
