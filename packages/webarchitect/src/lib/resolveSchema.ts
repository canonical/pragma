import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ErrorObject } from "ajv";
import { BUNDLED_RULESETS_DIR } from "../constants.js";
import motherSchema from "../schema.json" with { type: "json" };
import type { Schema } from "../types.js";
import ajv from "./ajv.js";
import discoverAllRulesets from "./discoverAllRulesets.js";

const validateSchema = ajv.compile(motherSchema);

/**
 * Formats AJV validation errors into a human-readable error message.
 * Groups errors by their property path and removes duplicate messages
 * to provide a clear summary of what's wrong with the schema.
 *
 * @param errors - Array of AJV ErrorObject instances
 * @returns Formatted error message with grouped validation failures
 *
 * @example
 * ```typescript
 * const errors = [
 *   { instancePath: "/name", message: "must be string" },
 *   { instancePath: "/extends", message: "must be array" }
 * ];
 * const message = formatValidationErrors(errors);
 * // Returns: "Schema validation failed:\n  name: must be string\n  extends: must be array"
 * ```
 */
function formatValidationErrors(errors: ErrorObject[]): string {
  // Group errors by property path
  const errorsByPath = new Map<string, string[]>();

  for (const error of errors) {
    const path = error.instancePath || "/";
    const message = error.message || "validation failed";

    if (!errorsByPath.has(path)) {
      errorsByPath.set(path, []);
    }
    // Safe access using optional chaining
    errorsByPath.get(path)?.push(message);
  }

  // Format as readable list
  const formattedErrors = Array.from(errorsByPath.entries())
    .map(([path, messages]) => {
      const uniqueMessages = [...new Set(messages)]; // Remove duplicates
      const property = path === "/" ? "root" : path.replace("/", "");
      return `  ${property}: ${uniqueMessages.join(", ")}`;
    })
    .join("\n");

  return `Schema validation failed:\n${formattedErrors}`;
}
/**
 * Resolves a schema identifier to a loaded and validated schema object.
 * Supports three resolution methods:
 * 1. Remote URLs (http:// or https://) - fetches schema from the web
 * 2. Local files - looks for .json files in current directory
 * 3. Built-in rulesets - checks bundled rulesets directory
 *
 * The loaded schema is validated against the mother schema to ensure
 * it conforms to the expected structure.
 *
 * @param schemaArg - Schema identifier: URL, file path, or built-in name
 * @returns Promise that resolves to the validated schema object
 * @throws Will throw an error if schema cannot be found or is invalid
 *
 * @example
 * ```typescript
 * // Load built-in ruleset
 * const schema1 = await resolveSchema("base-package");
 *
 * // Load from local file
 * const schema2 = await resolveSchema("./my-rules.json");
 *
 * // Load from URL
 * const schema3 = await resolveSchema("https://example.com/schema.json");
 * ```
 */
export default async function resolveSchema(
  schemaArg: string,
): Promise<Schema> {
  let schemaData: Schema;
  let schemaSource: string;

  if (schemaArg.startsWith("http://") || schemaArg.startsWith("https://")) {
    schemaSource = schemaArg;
    const response = await fetch(schemaArg);
    schemaData = (await response.json()) as Schema;
  } else {
    let schemaPath = schemaArg;
    if (
      !schemaPath.endsWith(".ruleset.json") &&
      !schemaPath.endsWith(".json")
    ) {
      schemaPath += ".ruleset.json";
    }

    try {
      schemaSource = schemaPath;
      schemaData = JSON.parse(await readFile(schemaPath, "utf-8"));
    } catch (_e) {
      const bundledPath = join(BUNDLED_RULESETS_DIR, schemaPath);
      try {
        schemaSource = bundledPath;
        schemaData = JSON.parse(await readFile(bundledPath, "utf-8"));
      } catch (_bundledError) {
        const { bundled } = await discoverAllRulesets();
        const availableNames = bundled.map((r) => r.name).join(", ");
        throw new Error(
          `Could not find ruleset: '${schemaArg}'. Checked local path '${schemaPath}' and bundled path '${bundledPath}'. Available bundled rulesets: ${availableNames}`,
        );
      }
    }
  }

  // Log where the ruleset was successfully loaded from
  console.log(`Loaded ruleset from: ${schemaSource}`);

  if (!validateSchema(schemaData)) {
    const errorMessage = formatValidationErrors(validateSchema.errors || []);
    throw new Error(`Invalid ruleset from ${schemaSource}:\n${errorMessage}`);
  }

  return schemaData;
}
