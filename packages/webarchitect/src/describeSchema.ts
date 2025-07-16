import type { JSONSchema7 } from "json-schema";

/**
 * Generates a human-readable description of what a JSON schema validates.
 * Summarizes key constraints like type, required properties, patterns, etc.
 * Used to provide clear feedback about what validation rules are being applied.
 *
 * @param schema - JSON Schema to describe
 * @returns Human-readable description of the schema's validation rules
 *
 * @example
 * ```typescript
 * const schema = {
 *   type: "object",
 *   required: ["name", "version"],
 *   properties: { name: {}, version: {} }
 * };
 * const desc = describeSchema(schema);
 * // Returns: "must be object, must have properties: name, version, expected properties: name, version"
 * ```
 */
export default function describeSchema(schema: JSONSchema7): string {
  const descriptions: string[] = [];

  if (schema.type) {
    if (typeof schema.type === "string") {
      descriptions.push(`must be ${schema.type}`);
    } else if (Array.isArray(schema.type)) {
      descriptions.push(`must be one of: ${schema.type.join(", ")}`);
    }
  }

  if (schema.const !== undefined) {
    descriptions.push(`must equal "${schema.const}"`);
  }

  if (typeof schema.pattern === "string") {
    descriptions.push(`must match pattern /${schema.pattern}/`);
  }

  if (schema.required && Array.isArray(schema.required)) {
    descriptions.push(`must have properties: ${schema.required.join(", ")}`);
  }

  if (schema.properties && typeof schema.properties === "object") {
    const propNames = Object.keys(schema.properties);
    if (propNames.length <= 3) {
      descriptions.push(`expected properties: ${propNames.join(", ")}`);
    } else {
      descriptions.push(`validates ${propNames.length} properties`);
    }
  }

  if (descriptions.length === 0) {
    return "validates file content structure";
  }

  return descriptions.join(", ");
}