import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Ajv from "ajv";
import type { ValidationResult } from "./types.js";

const ajv = new Ajv();

export default async function validateFileRule(
	projectPath: string,
	fileRule: { name: string; contains: any },
): Promise<ValidationResult[]> {
	const filePath = join(projectPath, fileRule.name);
	try {
		const content = await readFile(filePath, "utf-8");
		const json = JSON.parse(content);
		const validate = ajv.compile(fileRule.contains);
		const valid = validate(json);
		if (valid) {
			return [{ rule: fileRule.name, passed: true }];
		}
		return [
			{
				rule: fileRule.name,
				passed: false,
				message: JSON.stringify(validate.errors),
			},
		];
	} catch (e) {
		return [
			{
				rule: fileRule.name,
				passed: false,
				message: `File not found or invalid JSON: ${e.message}`,
			},
		];
	}
}
