import { stat } from "node:fs/promises";
import { join } from "node:path";
import listDirectory from "./listDirectory.js";
import type { DirectoryRule, ValidationResult } from "./types.js";
import validateFileRule from "./validateFileRule.js";

export default async function validateDirectoryRule(
  projectPath: string,
  dirRule: DirectoryRule,
): Promise<ValidationResult[]> {
  const dirPath = join(projectPath, dirRule.name);
  const results: ValidationResult[] = [];

  // Check if directory exists
  try {
    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      return [
        {
          rule: dirRule.name,
          passed: false,
          message: `Expected directory but found file: ${dirPath}`,
        },
      ];
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return [
        {
          rule: dirRule.name,
          passed: false,
          message: `Directory not found: ${dirPath}`,
        },
      ];
    }
    return [
      {
        rule: dirRule.name,
        passed: false,
        message: `Error accessing directory: ${(e as Error).message}`,
      },
    ];
  }

  // Validate contained files and directories
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
      results.push({ rule: dirRule.name, passed: false, message });
    }
  }

  if (results.length === 0 || results.every((r) => r.passed)) {
    results.push({ rule: dirRule.name, passed: true });
  }

  return results;
}
