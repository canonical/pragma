/**
 * The filter records a mounted root owns: the feedback a control shows,
 * the state one record holds, the handle it hands out and the keyed set of
 * them a root builds over its provider. Together because a control reads
 * them together, beside one input.
 */

import type { ReadonlyChannel } from "../observable/index.js";
import type { ProviderHost } from "../provider/index.js";
import type {
  Predicate,
  PredicateOperand,
  PredicateOperator,
} from "../query/index.js";
import type { SourceRefusal } from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import type {
  AppliedOf,
  EmptyOr,
  FieldKind,
  FieldKindOperators,
  Schema,
  SchemaFieldDefinition,
  TextField,
} from "../schema/index.js";

/**
 * Feedback a filter control renders beside its input. `invalid` is an
 * input the field's kind cannot read; `refused` is one it read but the
 * source cannot execute, with the coded refusals a control switches on.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FilterFeedback =
  | { readonly status: "none" }
  | { readonly status: "applied" }
  | { readonly status: "incomplete" }
  | {
      readonly status: "invalid";
      readonly reason: string;
      /** True when a prior applied predicate is still restricting results. */
      readonly retainsPredicate: boolean;
    }
  | {
      readonly status: "refused";
      readonly refusals: readonly SourceRefusal[];
      /** True when a prior applied predicate is still restricting results. */
      readonly retainsPredicate: boolean;
    };

/**
 * Immutable state of one filter record: the text in its input and the
 * feedback beside it. The applied value is its own channel.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FilterInputState = {
  readonly input: string;
  readonly feedback: FilterFeedback;
};

/**
 * One filter address on a root: observation plus bounded edits. Edits go
 * straight to the provider's applied query; an invalid, incomplete or
 * refused edit keeps the predicate already in force and says so in the
 * feedback.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FilterHandle<TApplied> = {
  /** The record's state: its input and its feedback. */
  readonly state: ReadonlyChannel<FilterInputState>;
  /** The applied semantic value, or empty while no predicate stands. */
  readonly applied: ReadonlyChannel<EmptyOr<TApplied>>;
  /** Edit through the text input; the feedback says what became of it. */
  readonly edit: (input: string) => void;
  /**
   * Set the semantic operands directly, as a multi-value control does.
   * Answers with the refusals the predicate incurred — empty when applied.
   * Operands the field's kind rejects are reported in the feedback and
   * apply nothing.
   */
  readonly set: (
    operands: readonly PredicateOperand[],
  ) => readonly SourceRefusal[];
  /** Remove the predicate, distinct from an empty edit. */
  readonly clear: () => readonly SourceRefusal[];
};

/** Configuration of one filter record. */
export type FilterInputConfig = {
  /** The schema the field is read through. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /** The field the record addresses. */
  readonly field: string;
  /** The operator the record addresses. */
  readonly operator: PredicateOperator;
  /** Where an applied predicate goes: the provider's two predicate commands. */
  readonly host: Pick<ProviderHost, "setPredicate" | "removePredicate">;
};

/** One filter record, with what only its owner reads and calls. */
export type FilterInput = FilterHandle<unknown> & {
  /** The predicate the record has applied, as it built it. */
  readonly predicate: Predicate | null;
  /**
   * Adopt the authoritative applied predicate — the query moved under the
   * record. Stale input and feedback are discarded, never replayed; the
   * predicate must address this record's field and operator.
   */
  readonly setApplied: (applied: Predicate | null) => void;
};

/**
 * One field's handles, keyed by the operators the field kind table declares
 * for its kind. Written as a conditional so the kind resolves to its
 * literal before the operators are looked up.
 */
type HandlesOfField<TDefinition extends SchemaFieldDefinition> =
  TDefinition extends { readonly kind: infer TKind extends FieldKind }
    ? {
        readonly [TOperator in FieldKindOperators[TKind]]: FilterHandle<
          AppliedOf<TDefinition>
        >;
      }
    : never;

/**
 * A root's filter handles, keyed by field and its legal operators — the
 * operators the field kind table declares for the field's kind.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FilterHandles<TFields extends readonly SchemaFieldDefinition[]> = {
  // A text field accepts no operator, so it has no handle to address.
  readonly [TDefinition in Exclude<
    TFields[number],
    TextField
  > as TDefinition["field"]]: HandlesOfField<TDefinition>;
};

/**
 * Configuration of one root's filter records.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FilterInputsConfig<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  /** The provider the records edit, through its internal host. */
  readonly host: ProviderHost<TFields, TRow>;
};

/**
 * The filter records of one mounted root: one per field and legal
 * operator, and the observation that keeps their applied mirrors in step
 * with the provider's query.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FilterInputs<TFields extends readonly SchemaFieldDefinition[]> = {
  readonly handles: FilterHandles<TFields>;
  /**
   * Follow the provider's query: an adopted location, a saved view or a
   * reset moves the applied predicates, and every record adopts its own.
   * The release stops following.
   */
  readonly observe: () => () => void;
};
