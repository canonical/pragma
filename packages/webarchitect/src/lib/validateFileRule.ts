import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FileRule, ValidationResult } from "../types.js";
import ajv from "./ajv.js";
import describeSchema from "./describeSchema.js";

/**
 * Validates a file against a file rule specification.
 * Reads the file, parses it as JSON, and validates against the provided schema.
 * Provides detailed error messages for missing files, invalid JSON, or schema violations.
 *
 * @param projectPath - Base path where the file should exist
 * @param fileRule - File rule specification including name and JSON schema
 * @param ruleName - Name of the rule for error reporting (e.g., "package-config")
 * @returns Promise that resolves to an array with a single validation result
 *
 * @example
 * ```typescript
 * const rule = {
 *   name: "package.json",
 *   contains: {
 *     type: "object",
 *     properties: {
 *       name: { type: "string" },
 *       version: { type: "string" }
 *     },
 *     required: ["name", "version"]
 *   }
 * };
 * const results = await validateFileRule("/project", rule, "package-config");
 * ```
 */
export default async function validateFileRule(
  projectPath: string,
  fileRule: FileRule,
  ruleName: string,
): Promise<ValidationResult[]> {
  const filePath = join(projectPath, fileRule.name);

  // Prepare base context for verbose output using the actual rule name
  const baseContext = {
    type: "file" as const,
    target: filePath,
    description: `Validates that ${fileRule.name} ${describeSchema(fileRule.contains)}`,
    schema: fileRule.contains,
  };

  try {
    const content = await readFile(filePath, "utf-8");

    // Hard fail: throw on malformed JSON with informative message
    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch (parseError) {
      throw new Error(
        `Invalid JSON in ${filePath}: ${(parseError as Error).message}`,
      );
    }

    // Soft fail: return validation result
    const validate = ajv.compile(fileRule.contains);
    const valid = validate(json);

    return [
      {
        rule: ruleName,
        passed: valid,
        message: valid
          ? undefined
          : `Validation failed: ${JSON.stringify(validate.errors)}`,
        context: {
          ...baseContext,
          value: json,
        },
      },
    ];
  } catch (readError) {
    if ((readError as NodeJS.ErrnoException).code === "ENOENT") {
      // Soft fail: file not found
      return [
        {
          rule: ruleName,
          passed: false,
          message: `File not found: ${filePath}`,
          context: {
            ...baseContext,
            value: "[File not found]",
          },
        },
      ];
    }

    // Hard fail: permission denied, I/O errors, etc. with informative message
    const errorCode = (readError as NodeJS.ErrnoException).code;
    const errorMessage =
      errorCode === "EACCES"
        ? `Permission denied accessing ${filePath}`
        : errorCode === "EISDIR"
          ? `Expected file but found directory: ${filePath}`
          : `Error reading file ${filePath}: ${(readError as Error).message}`;

    throw new Error(errorMessage);
  }
}
