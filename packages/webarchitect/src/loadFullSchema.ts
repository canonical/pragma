import resolveSchema from "./resolveSchema.js";
import type { Schema } from "./types.js";

/**
 * Loads a schema and recursively resolves all extended schemas.
 * Merges rules from parent schemas with child schemas, where child
 * rules override parent rules with the same name. Special properties
 * like $schema and name are preserved from the child schema.
 *
 * @param schemaArg - Schema identifier (built-in name, file path, or URL)
 * @returns Promise that resolves to the fully merged schema with all extensions resolved
 * @throws Will throw an error if any schema in the inheritance chain cannot be loaded
 *
 * @example
 * ```typescript
 * // Load a schema that extends other schemas
 * const schema = await loadFullSchema("package-react");
 * // Returns merged schema with rules from base, base-package, and package-react
 * ```
 */
export default async function loadFullSchema(
  schemaArg: string,
): Promise<Schema> {
  const schema = await resolveSchema(schemaArg);
  if (schema.extends) {
    const baseSchemas = await Promise.all(schema.extends.map(loadFullSchema));
    const baseRules = baseSchemas.reduce((acc, s) => {
      const { extends: _, ...rules } = s;
      return { ...acc, ...rules };
    }, {});
    const { $schema, name, extends: _, ...rules } = schema;
    return Object.assign({}, baseRules, rules, { $schema, name });
  }
  return schema;
}
