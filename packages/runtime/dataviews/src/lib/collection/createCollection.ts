import type { RowRecord } from "../rows/index.js";
import { createSchema, type SchemaFieldDefinition } from "../schema/index.js";
import readRecordTypes from "./readRecordTypes.js";
import type { Collection, CollectionConfig } from "./types.js";

/**
 * Declare one collection: its schema, its record identity and, when its
 * records come in several types, the field that names each record's type.
 * Declared once at module scope, it is the witness the provider is built
 * over and the hooks take; it holds no state, so it is safe to share
 * across requests and roots.
 *
 * The record type is inferred from `identify`'s parameter and the field
 * literals from `fields`, so neither is spelled by hand. A discriminator
 * that names no `choices` field of string options, or a field scoped to a
 * type the discriminator does not declare, throws here rather than at the
 * first row.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createCollection<
  const TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(config: CollectionConfig<TFields, TRow>): Collection<TFields, TRow> {
  const schema = createSchema(config.fields);
  return Object.freeze({
    schema,
    identify: config.identify,
    types:
      config.discriminator === undefined
        ? null
        : readRecordTypes(schema, config.discriminator),
  });
}
