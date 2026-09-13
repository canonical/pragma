/**
 * Schema field definitions for the bounded collection grammar. The field
 * kind decides its legal operators, its applied semantic type and how an
 * text input validates.
 */

/** A closed-set field: equality over a set of option values. */
export type ChoicesField = {
  readonly field: string;
  readonly kind: "choices";
  readonly options: readonly (string | number)[];
};

/** A numeric field: lower/upper bounds with optional limits. */
export type NumberField = {
  readonly field: string;
  readonly kind: "number";
  readonly min?: number;
  readonly max?: number;
};

/** A presence field: the zero-value isSet operator. */
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

/** One schema field definition; any kind may be scoped to record types. */
export type SchemaFieldDefinition = TypeScoped &
  (ChoicesField | NumberField | FlagField | DateField | TextField);

/**
 * The applied semantic value a field's predicate carries. A text field
 * carries no predicate, so it applies nothing.
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
 * Maps a field definition list to its applied semantic types, keyed by
 * field name. Literal field names and options are inferred through the
 * schema factory's const type parameter, with no `as const` annotation.
 */
export type AppliedValues<TFields extends readonly SchemaFieldDefinition[]> = {
  readonly [TDefinition in Exclude<
    TFields[number],
    TextField
  > as TDefinition["field"]]: AppliedOf<TDefinition>;
};

/**
 * A value that may be absent.
 *
 * `T | null` would not do: `null` is a legal `PredicateOperand`, so an
 * applied value that *is* null and one that is absent are different facts
 * and must stay tellable apart. No field kind applies a null value today;
 * the explicit split is what keeps the door open without ambiguity.
 */
export type EmptyOr<T> =
  | { readonly kind: "empty" }
  | { readonly kind: "value"; readonly value: T };
