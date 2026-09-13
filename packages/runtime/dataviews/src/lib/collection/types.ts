/**
 * The collection: the schema, the record identity and the record types,
 * declared once at module scope. It is the witness every hook and every
 * provider is built over, and it holds no state, so one module-scope
 * object serves every request and every root.
 */

import type { RowIdentifier, RowRecord } from "../rows/index.js";
import type { Schema, SchemaFieldDefinition } from "../schema/index.js";

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
 * A collection's record types as it declares them: the discriminator
 * field every row carries its type in, and every type name that field
 * declares, in declaration order.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type RecordTypes = {
  /** The schema field every row carries its type in. */
  readonly field: string;
  /** Every type name the field declares, in declaration order. */
  readonly names: readonly string[];
};

/**
 * Configuration of one collection: the fields, the identity function and
 * the discriminator, if the records come in several types.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type CollectionConfig<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
> = {
  /** The schema's field definitions, as `createSchema` takes them. */
  readonly fields: TFields;
  /**
   * Reads one record's stable identity. Required, and typed over the
   * record: the record type is inferred from its parameter, so the field
   * list and the record type are declared once and never spelled by hand.
   */
  readonly identify: RowIdentifier<TRow>;
  /**
   * How this collection's records declare their type: one `choices` field
   * of the schema, carried by every row. Left out, the collection is
   * monomorphic — no memory is kept, no row is read for a type, and nothing
   * else behaves differently. A field scoped with `appliesTo` is then
   * inert, since there is only the one type for it to apply to.
   */
  readonly discriminator?: DiscriminatorField<TFields, TRow> | undefined;
};

/**
 * One collection, declared at module scope: its schema, its record
 * identity and its record types. The witness `useDataViews(collection)`
 * and `createDataViewsProvider({ collection })` take, and the object the
 * runtime check compares by reference.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Collection<
  TFields extends
    readonly SchemaFieldDefinition[] = readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  readonly schema: Schema<TFields>;
  readonly identify: RowIdentifier<TRow>;
  /**
   * The collection's record types, or null when it declares none and is
   * therefore monomorphic. A field's scope is narrower than the
   * collection's — it is the `appliesTo` of that field's own definition.
   */
  readonly types: RecordTypes | null;
};
