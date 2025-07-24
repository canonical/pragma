import type { Rule, Schema, ValidationResult } from "../types.js";
import validateRule from "./validateRule.js";

/**
 * Executes all validation rules defined in a schema against a project.
 * Iterates through each rule in the schema and delegates to validateRule.
 *
 * @param projectPath - Absolute or relative path to the project directory to validate
 * @param schema - Schema object containing validation rules to execute
 * @returns Promise that resolves to an array of validation results
 *
 * @example
 * ```typescript
 * const schema = {
 *   name: "my-schema",
 *   "package-config": {
 *     file: { name: "package.json", contains: {...} }
 *   }
 * };
 * const results = await executeValidationRules("/path/to/project", schema);
 * ```
 */
export default async function executeValidationRules(
  projectPath: string,
  schema: Schema,
): Promise<ValidationResult[]> {
  // Filter and map rules to validation promises
  const validationPromises = Object.entries(schema)
    .filter(([ruleName, rule]) => {
      // Skip meta-properties that aren't validation rules
      if (
        ruleName === "$schema" ||
        ruleName === "name" ||
        ruleName === "extends"
      )
        return false;

      // Type guard to ensure rule is an object with 'file' or 'directory'
      return (
        typeof rule === "object" &&
        rule !== null &&
        ("file" in rule || "directory" in rule)
      );
    })
    .map(([ruleName, rule]) =>
      validateRule(projectPath, rule as Rule, ruleName),
    );

  // Execute all validations in parallel
  const nestedResults = await Promise.all(validationPromises);

  // Flatten the results array
  return nestedResults.flat();
}
