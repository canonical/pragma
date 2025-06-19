import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Ajv from "ajv";
import motherSchema from "./schema.json" with { type: "json" };
import type { Schema } from "./types.js";

const ajv = new Ajv.default();
const validateSchema = ajv.compile(motherSchema);

export default async function resolveSchema(
  schemaArg: string,
): Promise<Schema> {
  let schemaData: Schema;
  if (schemaArg.startsWith("http://") || schemaArg.startsWith("https://")) {
    const response = await fetch(schemaArg);
    schemaData = (await response.json()) as Schema;
  } else {
    let schemaPath = schemaArg;
    if (!schemaPath.endsWith(".json")) {
      schemaPath += ".json";
    }
    try {
      schemaData = JSON.parse(await readFile(schemaPath, "utf-8"));
    } catch (e) {
      const bundledPath = join(__dirname, "../rulesets", schemaPath);
      schemaData = JSON.parse(await readFile(bundledPath, "utf-8"));
    }
  }
  if (!validateSchema(schemaData)) {
    throw new Error(`Invalid schema: ${JSON.stringify(validateSchema.errors)}`);
  }
  return schemaData;
}
