import {
  executeValidationRules,
  loadFullSchema,
  substituteVariables,
} from "./lib/index.js";
import type { ValidationResult } from "./types.js";

/**
 * Main validation function that validates a project against a specified ruleset.
 * This is the primary API entry point for the webarchitect validation system.
 * Handles schema loading, inheritance resolution, and rule execution.
 *
 * @param projectPath - Path to the project directory to validate
 * @param schemaArg - Schema identifier: built-in name, file path, or URL
 * @param variableOverrides - Template variable values supplied via `--var` / `--prefix`
 * @returns Promise that resolves to an array of validation results
 * @throws Will throw an error if schema cannot be loaded or is invalid
 *
 * @example
 * ```typescript
 * // Validate current directory with built-in ruleset
 * const results = await validate(process.cwd(), "base-package");
 *
 * // Check if validation passed
 * const passed = results.every(r => r.passed);
 * console.log(passed ? "All checks passed!" : "Some checks failed");
 *
 * // Override a ruleset's template variable
 * await validate(process.cwd(), "library", { prefix: "@myorg/" });
 * ```
 */
export default async function validate(
  projectPath: string,
  schemaArg: string,
  variableOverrides: Record<string, string> = {},
): Promise<ValidationResult[]> {
  const schema = await loadFullSchema(schemaArg);
  const resolved = substituteVariables(schema, variableOverrides);
  return executeValidationRules(projectPath, resolved);
}
