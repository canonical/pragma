import type { Rule, ValidationResult } from "../types.js";
import validateDirectoryRule from "./validateDirectoryRule.js";
import validateFileRule from "./validateFileRule.js";

/**
 * Validates a rule against a project path.
 * Determines whether the rule is a file or directory rule and delegates
 * to the appropriate validation logic.
 *
 * @param projectPath - Absolute or relative path to the project directory to validate
 * @param rule - Rule object containing either file or directory validation specification
 * @param ruleName - Name of the rule for error reporting
 * @returns Promise that resolves to an array of validation results
 *
 * @example
 * ```typescript
 * const rule = {
 *   file: { name: "package.json", contains: {...} }
 * };
 * const results = await validateRule("/path/to/project", rule, "package-config");
 * ```
 */
export default async function validateRule(
  projectPath: string,
  rule: Rule,
  ruleName: string,
): Promise<ValidationResult[]> {
  switch (true) {
    case "file" in rule:
      return validateFileRule(projectPath, rule.file, ruleName);
    case "directory" in rule:
      return validateDirectoryRule(projectPath, rule.directory, ruleName);
    default:
      // Hard fail: invalid rule type indicates a programming error or corrupted schema
      throw new Error(
        `Invalid rule type for '${ruleName}': expected rule to have 'file' or 'directory' property, but got ${JSON.stringify(rule)}`,
      );
  }
}
