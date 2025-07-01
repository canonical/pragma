import resolveSchema from "./resolveSchema.js";
import type { Schema } from "./types.js";

export default async function loadFullSchema(
  schemaArg: string,
): Promise<Schema> {
  const schema = await resolveSchema(schemaArg);
  if (schema.extends) {
    const baseSchemas = await Promise.all(schema.extends.map(loadFullSchema));
    const baseRules = baseSchemas.reduce((acc, s) => {
      const { $schema, name, extends: _, ...rules } = s;
      return Object.assign(acc, rules);
    }, {});
    const { $schema, name, extends: _, ...rules } = schema;
    return Object.assign({}, baseRules, rules, { $schema, name });
  }
  return schema;
}
