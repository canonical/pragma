import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import { WRITTEN_QUERY_KEYS } from "./constants.js";
import readWireField from "./readWireField.js";

/**
 * Whether one parameter belongs to a collection's query: a written name, a
 * field, or any `field__…` address of one — a refused operator included, so
 * the encoder clears what the decoder reported. A delimited name whose
 * prefix is no field is the host's.
 */
export default function isOwnedKey(
  key: string,
  schema: Schema<readonly SchemaFieldDefinition[]>,
): boolean {
  return (
    WRITTEN_QUERY_KEYS.includes(key) ||
    schema.findField(readWireField(key)) !== undefined
  );
}
