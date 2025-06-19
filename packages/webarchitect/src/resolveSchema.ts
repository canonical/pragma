import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ErrorObject } from "ajv";
import ajv from "./ajv.js";
import motherSchema from "./schema.json" with { type: "json" };
import type { Schema } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const validateSchema = ajv.compile(motherSchema);

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
    if (!schemaPath.endsWith(".json")) {
      schemaPath += ".json";
    }

    try {
      schemaSource = schemaPath;
      schemaData = JSON.parse(await readFile(schemaPath, "utf-8"));
    } catch (e) {
      const bundledPath = join(__dirname, "../../rulesets", schemaPath);
      try {
        schemaSource = bundledPath;
        schemaData = JSON.parse(await readFile(bundledPath, "utf-8"));
      } catch (bundledError) {
        throw new Error(
          `Could not find ruleset: '${schemaArg}'. Checked local path '${schemaPath}' and bundled path '${bundledPath}'. Available bundled rulesets: base, package, package-react`,
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
