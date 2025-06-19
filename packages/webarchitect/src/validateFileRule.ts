import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Ajv from "ajv";
import type { FileRule, ValidationResult } from "./types.js";

const ajv = new Ajv.default();

export default async function validateFileRule(
  projectPath: string,
  fileRule: FileRule,
): Promise<ValidationResult[]> {
  const filePath = join(projectPath, fileRule.name);
  try {
    const content = await readFile(filePath, "utf-8");
    try {
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
          message: `Validation failed: ${JSON.stringify(validate.errors)}`,
        },
      ];
    } catch (parseError) {
      return [
        {
          rule: fileRule.name,
          passed: false,
          message: `Invalid JSON: ${(parseError as Error).message}`,
        },
      ];
    }
  } catch (readError) {
    if ((readError as NodeJS.ErrnoException).code === "ENOENT") {
      return [
        {
          rule: fileRule.name,
          passed: false,
          message: `File not found: ${filePath}`,
        },
      ];
    }
    return [
      {
        rule: fileRule.name,
        passed: false,
        message: `Error reading file: ${(readError as Error).message}`,
      },
    ];
  }
}
