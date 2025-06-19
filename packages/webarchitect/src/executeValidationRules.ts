import type { Schema, ValidationResult } from "./types.js";
import validateDirectoryRule from "./validateDirectoryRule.js";
import validateFileRule from "./validateFileRule.js";

export default async function executeValidationRules(
  projectPath: string,
  schema: Schema,
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  for (const [ruleName, rule] of Object.entries(schema)) {
    if (ruleName === "$schema" || ruleName === "name" || ruleName === "extends")
      continue;
    if (typeof rule === "object" && "file" in rule) {
      const fileResults = await validateFileRule(projectPath, rule.file);
      results.push(...fileResults);
    } else if (typeof rule === "object" && "directory" in rule) {
      const dirResults = await validateDirectoryRule(
        projectPath,
        rule.directory,
      );
      results.push(...dirResults);
    }
  }
  return results;
}
