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

/** A date field: ISO-8601 calendar-date bounds. */
export type DateField = {
  readonly field: string;
  readonly kind: "date";
};

/** One schema field definition. */
export type SchemaFieldDefinition =
  | ChoicesField
  | NumberField
  | FlagField
  | DateField;

/** The applied semantic value a field's predicate carries. */
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
  readonly [TDefinition in TFields[number] as TDefinition["field"]]: AppliedOf<TDefinition>;
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
