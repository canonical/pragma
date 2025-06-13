import type { ValidationResult } from "./types.js";
import validateDirectoryRule from "./validateDirectoryRule.js";
import validateFileRule from "./validateFileRule.js";

export default async function validateProject(
	projectPath: string,
	schema: any,
): Promise<ValidationResult[]> {
	const results: ValidationResult[] = [];
	for (const [ruleName, rule] of Object.entries(schema)) {
		if (ruleName === "$schema" || ruleName === "name" || ruleName === "extends")
			continue;
		if (rule.file) {
			const fileResults = await validateFileRule(projectPath, rule.file);
			results.push(...fileResults);
		} else if (rule.directory) {
			const dirResults = await validateDirectoryRule(
				projectPath,
				rule.directory,
			);
			results.push(...dirResults);
		}
	}
	return results;
}
