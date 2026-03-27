import ejsEngine from "./ejsEngine.js";
import type TemplatingEngine from "./TemplatingEngine.js";

/**
 * Render a template string asynchronously.
 */
export default async function renderStringAsync(
  template: string,
  vars: Record<string, unknown>,
  engine: TemplatingEngine = ejsEngine,
): Promise<string> {
  return engine.renderAsync(template, vars);
}
