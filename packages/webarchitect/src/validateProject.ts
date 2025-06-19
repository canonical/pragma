import type { Schema, ValidationResult } from "./types.js";
import validateDirectoryRule from "./validateDirectoryRule.js";
import validateFileRule from "./validateFileRule.js";

/**
 * Legacy validation function maintained for backward compatibility.
 * Consider using executeValidationRules.ts for new code as it provides
 * better rule name tracking and inheritance support.
 */
export default async function validateProject(
  projectPath: string,
  schema: Schema,
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Iterate through schema rules, similar to executeValidationRules but simpler
  for (const [ruleName, rule] of Object.entries(schema)) {
    // Skip meta-properties that aren't validation rules
    if (ruleName === "$schema" || ruleName === "name" || ruleName === "extends")
      continue;

    // Type guard to ensure rule is an object with 'file' or 'directory'
    if (typeof rule === "object" && rule !== null) {
      if ("file" in rule) {
        // Pass the rule name context to match current function signature
        const fileResults = await validateFileRule(
          projectPath,
          rule.file,
          ruleName,
        );
        results.push(...fileResults);
      } else if ("directory" in rule) {
        // Pass the rule name context to match current function signature
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
