import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ValidationResult } from "./types.js";
import validateFileRule from "./validateFileRule.js";

export default async function validateDirectoryRule(
	projectPath: string,
	dirRule: {
		name: string;
		contains?: { files?: any[]; directories?: any[] };
		strict?: boolean;
	},
): Promise<ValidationResult[]> {
	const dirPath = join(projectPath, dirRule.name);
	try {
		const stats = await stat(dirPath);
		if (!stats.isDirectory()) {
			return [
				{
					rule: dirRule.name,
					passed: false,
					message: "Expected directory, but found file",
				},
			];
		}
	} catch (e) {
		return [
			{ rule: dirRule.name, passed: false, message: "Directory not found" },
		];
	}

	const results: ValidationResult[] = [];

	if (dirRule.contains) {
		if (dirRule.contains.files) {
			for (const fileRule of dirRule.contains.files) {
				const fileResults = await validateFileRule(dirPath, fileRule);
				results.push(...fileResults);
			}
		}
		if (dirRule.contains.directories) {
			for (const subDirRule of dirRule.contains.directories) {
				const subDirResults = await validateDirectoryRule(dirPath, subDirRule);
				results.push(...subDirResults);
			}
		}
	}

	if (dirRule.strict) {
		const { files, directories } = await listDirectory(dirPath);
		const expectedFiles = dirRule.contains?.files?.map((f) => f.name) || [];
		const expectedDirs =
			dirRule.contains?.directories?.map((d) => d.name) || [];
		const extraFiles = files.filter((f) => !expectedFiles.includes(f));
		const extraDirs = directories.filter((d) => !expectedDirs.includes(d));
		if (extraFiles.length > 0 || extraDirs.length > 0) {
			results.push({
				rule: dirRule.name,
				passed: false,
				message: `Strict mode: extra files or directories found: ${extraFiles.join(", ")}, ${extraDirs.join(", ")}`,
			});
		}
	}

	if (results.every((r) => r.passed)) {
		results.push({ rule: dirRule.name, passed: true });
	}

	return results;
}

async function listDirectory(
	path: string,
): Promise<{ files: string[]; directories: string[] }> {
	const entries = await readdir(path, { withFileTypes: true });
	const files = entries
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name);
	const directories = entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
	return { files, directories };
}
