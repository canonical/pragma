/**
 * Schema field definitions for the bounded collection grammar, and the
 * shape of the one table that says what a field kind decides: its legal
 * operators, how an input parses, which operands it rejects, its applied
 * value and that value's equality, how two of its values compare for a
 * range, and how its rows order.
 */

import type { FieldValidation } from "../field/index.js";
import type {
  Predicate,
  PredicateOperand,
  PredicateOperator,
} from "../query/index.js";

/**
 * A closed-set field: equality over a set of option values.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ChoicesField = {
  readonly field: string;
  readonly kind: "choices";
  readonly options: readonly (string | number)[];
};

/**
 * A numeric field: lower/upper bounds with optional limits.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type NumberField = {
  readonly field: string;
  readonly kind: "number";
  readonly min?: number;
  readonly max?: number;
};

/**
 * A presence field: the zero-value isSet operator.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FlagField = {
  readonly field: string;
  readonly kind: "flag";
};

/**
 * A date field: ISO-8601 calendar-date bounds.
 *
 * The filter domain is the calendar date. For ordering, a row value may be a
 * calendar-date string, an ISO-8601 instant carrying `Z` or an offset, a
 * `Date`, or epoch milliseconds, all compared as instants. A local range
 * filter still compares a row's value with the calendar-date bound as given,
 * so it reads only calendar-date strings.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DateField = {
  readonly field: string;
  readonly kind: "date";
};

/**
 * A free-text field: ordered through the source's collator, and filtered by
 * nothing. The grammar has no substring operator, so a text field carries no
 * predicate and free-text search covers the reading it would have served.
 *
 * @experimental A substring operator may later give the kind a filter, which
 * would change the applied value it maps to.
 */
export type TextField = {
  readonly field: string;
  readonly kind: "text";
};

/**
 * Which record types a field applies to; absent means every one of them.
 *
 * For a row of another type the field is *not applicable* — a third state
 * beside value and empty. It never satisfies a predicate, `isSet` included,
 * and it reads as absent to ordering, so a predicate on a scoped field
 * restricts the result to that field's types by meaning and never by
 * spelling: nothing is added to the query, the wire or a saved view.
 *
 * That holds because a source writes no value at a scoped key for a row the
 * field does not apply to, which is the source's obligation and not checked
 * here: a row carrying one anyway is filtered and ordered by it.
 *
 * A collection declaring no discriminator has one record type, so scoping
 * has nothing to exclude and every field applies to every row.
 */
type TypeScoped = {
  readonly types?: readonly string[];
};

/**
 * One schema field definition; any kind may be scoped to record types.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SchemaFieldDefinition = TypeScoped &
  (ChoicesField | NumberField | FlagField | DateField | TextField);

/**
 * The applied semantic value a field's predicate carries. A text field
 * carries no predicate, so it applies nothing.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type AppliedOf<TField extends SchemaFieldDefinition> = TField extends {
  readonly kind: "choices";
  readonly options: infer TOptions;
}
  ? ReadonlySet<
      TOptions extends readonly (string | number)[] ? TOptions[number] : never
    >
  : TField extends { readonly kind: "number" }
    ? number
    : TField extends { readonly kind: "flag" }
      ? boolean
      : TField extends { readonly kind: "date" }
        ? string
        : never;

/**
 * A value that may be absent.
 *
 * `T | null` would not do: `null` is a legal `PredicateOperand`, so an
 * applied value that *is* null and one that is absent are different facts
 * and must stay tellable apart. No field kind applies a null value today;
 * the explicit split is what keeps the door open without ambiguity.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type EmptyOr<T> =
  | { readonly kind: "empty" }
  | { readonly kind: "value"; readonly value: T };

/**
 * The kinds a schema field may be.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FieldKind = SchemaFieldDefinition["kind"];

/**
 * The operators each kind accepts, at the type level: what the runtime
 * table declares, spelled so a provider's field handles can be keyed by
 * operator from a definition's kind alone.
 */
export type FieldKindOperators = {
  readonly choices: "eq";
  readonly number: "gte" | "lte";
  readonly flag: "isSet";
  readonly date: "gte" | "lte";
  readonly text: never;
};

/** One text input read as an operand, or the reason it is not one. */
export type InputParse =
  | { readonly status: "valid"; readonly operand: PredicateOperand }
  | { readonly status: "invalid"; readonly reason: string };

/**
 * The comparison key of one present value: a rank the kind places it at,
 * then the text that orders values sharing a rank. Numbers, instants, flags
 * and declared options need only the rank; text needs only the text; an
 * option the schema does not list needs both.
 */
export type OrderKey = {
  readonly rank: number;
  readonly text: string;
};

/** How one field's kind reads and compares its ordering keys. */
export type KindOrder = {
  /**
   * The key of a row value, or null when the kind has none for it: that
   * value is empty, and orders after every value with a key.
   */
  readonly readKey: (value: unknown) => OrderKey | null;
  /** Order two values sharing a rank. */
  readonly compareText: (a: string, b: string) => number;
};

/**
 * Everything one field kind decides, in one place. Each member takes the
 * field's own definition where the kind's rules depend on it — an option
 * list, a numeric range.
 */
export type FieldKindRules<
  TDefinition extends SchemaFieldDefinition = SchemaFieldDefinition,
> = {
  /**
   * The operators the kind accepts; empty for a kind the grammar has none
   * for. Typed by the kind, so a row cannot list an operator the type-level
   * table does not give it.
   */
  readonly operators: readonly FieldKindOperators[TDefinition["kind"]][];
  /**
   * Why a definition of the kind is malformed — an inverted range, an
   * empty option list — or null when it is well-formed.
   */
  readonly rejectDefinition: (definition: TDefinition) => string | null;
  /**
   * How the kind edits through a text input: by parsing one non-empty
   * input as an operand, or not at all, with the reason a control shows.
   */
  readonly input:
    | {
        readonly kind: "text";
        readonly parse: (definition: TDefinition, input: string) => InputParse;
      }
    | { readonly kind: "none"; readonly reason: string };
  /** Why operands are outside the kind's domain, or null when they are in it. */
  readonly rejectOperands: (
    definition: TDefinition,
    operands: readonly PredicateOperand[],
  ) => string | null;
  /** The applied semantic value one predicate of the kind carries. */
  readonly readApplied: (predicate: Predicate) => unknown;
  /** Whether two applied values of the kind are the same value. */
  readonly areAppliedEqual: (a: unknown, b: unknown) => boolean;
  /**
   * Order a row value against a range bound, for a `gte` or `lte` test:
   * negative, zero or positive, or null when the two are not comparable —
   * the value is outside the kind's domain, or the kind has no range.
   */
  readonly compareToBound: (
    value: unknown,
    bound: PredicateOperand,
  ) => number | null;
  /**
   * How rows order by a field of the kind, given the collator the source
   * declares for text.
   */
  readonly createOrder: (
    definition: TDefinition,
    collator: Intl.Collator | null,
  ) => KindOrder;
};

/**
 * A schema-enforced predicate, or the reason it is not valid.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SchemaPredicateResult =
  | { readonly status: "valid"; readonly predicate: Predicate }
  | { readonly status: "invalid"; readonly reason: string };

/**
 * Handle of one collection schema.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Schema<TFields extends readonly SchemaFieldDefinition[]> = {
  /** The field definitions as a frozen copy, in construction order. */
  readonly fields: TFields;
  /** All field names, in definition order. */
  readonly fieldNames: readonly string[];
  /** The definition of one field, or undefined when the schema has none by that name. */
  readonly findField: (name: string) => SchemaFieldDefinition | undefined;
  /**
   * The operators the field's kind accepts, empty for an unknown field and
   * for a kind the grammar has no operator for. One authority, so a source
   * declaring what it filters and a control offering it agree.
   *
   * @experimental Added with the text kind; a later operator on text would
   * change what it lists for such a field.
   */
  readonly listOperators: (name: string) => readonly PredicateOperator[];
  /**
   * Validate one text input for the field's single-value editing path.
   * Flag and text fields do not edit through a text input.
   */
  readonly validateInput: (name: string, input: string) => FieldValidation;
  /**
   * Build the addressed predicate for a field, enforcing the kind's legal
   * operators, the operator's grammar arity, and schema semantics beyond
   * the generic grammar: option membership, numeric range and date format.
   */
  readonly predicateFor: (
    name: string,
    operator: PredicateOperator,
    operands: readonly PredicateOperand[],
  ) => SchemaPredicateResult;
};
