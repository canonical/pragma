import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { JSONSchema7 } from "json-schema";
import ajv from "./ajv.js";
import type { FileRule, ValidationResult } from "./types.js";

// Generate a human-readable description of what a schema validates
// Using JSONSchema7 type for better type safety than 'any'
function describeSchema(schema: JSONSchema7): string {
  const descriptions: string[] = [];

  if (schema.type) {
    if (typeof schema.type === "string") {
      descriptions.push(`must be ${schema.type}`);
    } else if (Array.isArray(schema.type)) {
      descriptions.push(`must be one of: ${schema.type.join(", ")}`);
    }
  }

  if (schema.const !== undefined) {
    descriptions.push(`must equal "${schema.const}"`);
  }

  if (typeof schema.pattern === "string") {
    descriptions.push(`must match pattern /${schema.pattern}/`);
  }

  if (schema.required && Array.isArray(schema.required)) {
    descriptions.push(`must have properties: ${schema.required.join(", ")}`);
  }

  if (schema.properties && typeof schema.properties === "object") {
    const propNames = Object.keys(schema.properties);
    if (propNames.length <= 3) {
      descriptions.push(`expected properties: ${propNames.join(", ")}`);
    } else {
      descriptions.push(`validates ${propNames.length} properties`);
    }
  }

  if (descriptions.length === 0) {
    return "validates file content structure";
  }

  return descriptions.join(", ");
}

export default async function validateFileRule(
  projectPath: string,
  fileRule: FileRule,
  ruleName: string, // Add rule name parameter
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
    try {
      const json = JSON.parse(content);
      const validate = ajv.compile(fileRule.contains);
      const valid = validate(json);

      if (valid) {
        return [
          {
            rule: ruleName, // Use the rule name from schema, not filename
            passed: true,
            context: {
              ...baseContext,
              actualValue: json,
            },
          },
        ];
      }

      return [
        {
          rule: ruleName, // Use the rule name from schema, not filename
          passed: false,
          message: `Validation failed: ${JSON.stringify(validate.errors)}`,
          context: {
            ...baseContext,
            actualValue: json,
          },
        },
      ];
    } catch (parseError) {
      return [
        {
          rule: ruleName, // Use the rule name from schema, not filename
          passed: false,
          message: `Invalid JSON: ${(parseError as Error).message}`,
          context: {
            ...baseContext,
            actualValue: `[Parse Error: ${(parseError as Error).message}]`,
          },
        },
      ];
    }
  } catch (readError) {
    if ((readError as NodeJS.ErrnoException).code === "ENOENT") {
      return [
        {
          rule: ruleName, // Use the rule name from schema, not filename
          passed: false,
          message: `File not found: ${filePath}`,
          context: {
            ...baseContext,
            actualValue: "[File not found]",
          },
        },
      ];
    }
    return [
      {
        rule: ruleName, // Use the rule name from schema, not filename
        passed: false,
        message: `Error reading file: ${(readError as Error).message}`,
        context: {
          ...baseContext,
          actualValue: `[Read Error: ${(readError as Error).message}]`,
        },
      },
    ];
  }
}
