import { stat } from "node:fs/promises";
import { join } from "node:path";
import listDirectory from "./listDirectory.js";
import type { DirectoryRule, ValidationResult } from "./types.js";
import validateFileRule from "./validateFileRule.js";

export default async function validateDirectoryRule(
  projectPath: string,
  dirRule: DirectoryRule,
  ruleName: string, // Add rule name parameter
): Promise<ValidationResult[]> {
  const dirPath = join(projectPath, dirRule.name);
  const results: ValidationResult[] = [];

  // Check if directory exists
  try {
    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      return [
        {
          rule: ruleName, // Use the rule name from schema
          passed: false,
          message: `Expected directory but found file: ${dirPath}`,
          context: {
            type: "directory" as const,
            target: dirPath,
            description: `Validates directory structure for ${dirRule.name}`,
            actualValue: "[File found instead of directory]",
          },
        },
      ];
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return [
        {
          rule: ruleName, // Use the rule name from schema
          passed: false,
          message: `Directory not found: ${dirPath}`,
          context: {
            type: "directory" as const,
            target: dirPath,
            description: `Validates directory structure for ${dirRule.name}`,
            actualValue: "[Directory not found]",
          },
        },
      ];
    }
    return [
      {
        rule: ruleName, // Use the rule name from schema
        passed: false,
        message: `Error accessing directory: ${(e as Error).message}`,
        context: {
          type: "directory" as const,
          target: dirPath,
          description: `Validates directory structure for ${dirRule.name}`,
          actualValue: `[Access Error: ${(e as Error).message}]`,
        },
      },
    ];
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
        rule: ruleName, // Use the rule name from schema
        passed: false,
        message,
        context: {
          type: "directory" as const,
          target: dirPath,
          description: `Strict validation for ${dirRule.name}`,
          actualValue: { extraFiles, extraDirs },
        },
      });
    }
  }

  // If no errors were found (or all were passing), add a success result
  if (results.length === 0 || results.every((r) => r.passed)) {
    results.push({
      rule: ruleName, // Use the rule name from schema
      passed: true,
      context: {
        type: "directory" as const,
        target: dirPath,
        description: `Validates directory structure for ${dirRule.name}`,
        actualValue: "[Directory exists and structure is valid]",
      },
    });
  }

  return results;
}
