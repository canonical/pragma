import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { DirectoryRule, ValidationResult } from "../types.js";
import listDirectory from "./listDirectory.js";
import validateFileRule from "./validateFileRule.js";

/**
 * Validates a directory against a directory rule specification.
 * Checks that the directory exists and validates its contents recursively.
 * In strict mode, also ensures no unexpected files or directories are present.
 *
 * @param projectPath - Base path where the directory should exist
 * @param dirRule - Directory rule specification including name and expected contents
 * @param ruleName - Name of the rule for error reporting (e.g., "src-structure")
 * @returns Promise that resolves to an array of validation results
 *
 * @example
 * ```typescript
 * const rule = {
 *   name: "src",
 *   contains: {
 *     files: [{ name: "index.ts", contains: {...} }],
 *     directories: [{ name: "components", contains: {...} }]
 *   },
 *   strict: true
 * };
 * const results = await validateDirectoryRule("/project", rule, "source-structure");
 * ```
 */
export default async function validateDirectoryRule(
  projectPath: string,
  dirRule: DirectoryRule,
  ruleName: string,
): Promise<ValidationResult[]> {
  const dirPath = join(projectPath, dirRule.name);
  const results: ValidationResult[] = [];

  // Check if directory exists
  try {
    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      // Soft fail: expected directory but found file
      return [
        {
          rule: ruleName,
          passed: false,
          message: `Expected directory but found file: ${dirPath}`,
          context: {
            type: "directory" as const,
            target: dirPath,
            description: `Validates directory structure for ${dirRule.name}`,
            value: "[File found instead of directory]",
          },
        },
      ];
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      // Soft fail: directory not found
      return [
        {
          rule: ruleName,
          passed: false,
          message: `Directory not found: ${dirPath}`,
          context: {
            type: "directory" as const,
            target: dirPath,
            description: `Validates directory structure for ${dirRule.name}`,
            value: "[Directory not found]",
          },
        },
      ];
    }

    // Hard fail: permission denied, I/O errors, etc. with informative message
    const errorCode = (e as NodeJS.ErrnoException).code;
    const errorMessage =
      errorCode === "EACCES"
        ? `Permission denied accessing directory ${dirPath}`
        : `Error accessing directory ${dirPath}: ${(e as Error).message}`;

    throw new Error(errorMessage);
  }

  // Validate contained files and directories
  if (dirRule.contains) {
    if (dirRule.contains.files) {
      for (const fileRule of dirRule.contains.files) {
        // When validating files within a directory rule, use a combined rule name
        const fileRuleName = `${ruleName}/${fileRule.name}`;
        const fileResults = await validateFileRule(
          dirPath,
          fileRule,
          fileRuleName,
        );
        results.push(...fileResults);
      }
    }
    if (dirRule.contains.directories) {
      for (const subDirRule of dirRule.contains.directories) {
        // When validating subdirectories, use a combined rule name
        const subDirRuleName = `${ruleName}/${subDirRule.name}`;
        const subDirResults = await validateDirectoryRule(
          dirPath,
          subDirRule,
          subDirRuleName,
        );
        results.push(...subDirResults);
      }
    }
  }

  // Strict mode validation
  if (dirRule.strict) {
    const { files, directories } = await listDirectory(dirPath);
    const expectedFiles = dirRule.contains?.files?.map((f) => f.name) || [];
    const expectedDirs =
      dirRule.contains?.directories?.map((d) => d.name) || [];
    const extraFiles = files.filter((f) => !expectedFiles.includes(f));
    const extraDirs = directories.filter((d) => !expectedDirs.includes(d));
    if (extraFiles.length > 0 || extraDirs.length > 0) {
      let message = "Strict mode: ";
      if (extraFiles.length > 0)
        message += `extra files found: ${extraFiles.join(", ")}`;
      if (extraDirs.length > 0) {
        if (extraFiles.length > 0) message += "; ";
        message += `extra directories found: ${extraDirs.join(", ")}`;
      }
      results.push({
        rule: ruleName,
        passed: false,
        message,
        context: {
          type: "directory" as const,
          target: dirPath,
          description: `Strict validation for ${dirRule.name}`,
          value: { extraFiles, extraDirs },
        },
      });
    }
  }

  // If no errors were found (or all were passing), add a success result
  if (results.length === 0 || results.every((r) => r.passed)) {
    results.push({
      rule: ruleName,
      passed: true,
      context: {
        type: "directory" as const,
        target: dirPath,
        description: `Validates directory structure for ${dirRule.name}`,
        value: "[Directory exists and structure is valid]",
      },
    });
  }

  return results;
}
