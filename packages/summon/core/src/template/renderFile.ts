import ejsEngine from "./ejsEngine.js";
import type TemplatingEngine from "./TemplatingEngine.js";

/**
 * Render a template file with variables.
 */
export default async function renderFile(
  templatePath: string,
  vars: Record<string, unknown>,
  engine: TemplatingEngine = ejsEngine,
): Promise<string> {
  return engine.renderFile(templatePath, vars);
}
