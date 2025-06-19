import executeValidationRules from "./executeValidationRules.js";
import loadFullSchema from "./loadFullSchema.js";
import type { ValidationResult } from "./types.js";

export default async function validate(
  projectPath: string,
  schemaArg: string,
): Promise<ValidationResult[]> {
  const schema = await loadFullSchema(schemaArg);
  return executeValidationRules(projectPath, schema);
}
