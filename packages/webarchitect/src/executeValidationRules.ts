import type { Schema, ValidationResult } from "./types.js";
import validateDirectoryRule from "./validateDirectoryRule.js";
import validateFileRule from "./validateFileRule.js";

export default async function executeValidationRules(
  projectPath: string,
  schema: Schema,
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Iterate through each rule in the schema
  for (const [ruleName, rule] of Object.entries(schema)) {
    // Skip meta-properties that aren't validation rules
    if (ruleName === "$schema" || ruleName === "name" || ruleName === "extends")
      continue;

    // Type guard to ensure rule is an object with 'file' or 'directory'
    if (typeof rule === "object" && rule !== null) {
      if ("file" in rule) {
        // Pass the rule name context to file validation
        const fileResults = await validateFileRule(
          projectPath,
          rule.file,
          ruleName,
        );
        results.push(...fileResults);
      } else if ("directory" in rule) {
        // Pass the rule name context to directory validation
        const dirResults = await validateDirectoryRule(
          projectPath,
          rule.directory,
          ruleName,
        );
        results.push(...dirResults);
      }
    }
  }
  return results;
}
