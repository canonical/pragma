import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import type { RecordTypes } from "./types.js";

/**
 * Read a collection's declared record types off its discriminator: the
 * field must exist, be a `choices` field with string options, and every
 * field scoped with `appliesTo` must name only types it declares. A
 * declaration that fails any of these throws at construction, so a
 * collection is never built over a discriminator that cannot name a
 * record's type.
 */
export default function readRecordTypes(
  schema: Schema<readonly SchemaFieldDefinition[]>,
  discriminator: string,
): RecordTypes {
  const definition = schema.findField(discriminator);
  if (definition === undefined) {
    throw new Error(`unknown discriminator field "${discriminator}"`);
  }
  if (definition.kind !== "choices") {
    throw new Error(
      `discriminator field "${discriminator}" must be a choices field, not a ${definition.kind} one`,
    );
  }
  const names: string[] = [];
  for (const option of definition.options) {
    if (typeof option !== "string") {
      throw new Error(
        `discriminator field "${discriminator}" requires string options`,
      );
    }
    names.push(option);
  }
  for (const scoped of schema.fields) {
    for (const name of scoped.appliesTo ?? []) {
      if (!names.includes(name)) {
        throw new Error(
          `field "${scoped.field}" is scoped to "${name}", which is not a type of "${discriminator}"`,
        );
      }
    }
  }
  return Object.freeze({ field: discriminator, names: Object.freeze(names) });
}
