import ejsEngine from "./ejsEngine.js";
import type TemplatingEngine from "./TemplatingEngine.js";

/**
 * Render a template string with variables.
 */
export default function renderString(
  template: string,
  vars: Record<string, unknown>,
  engine: TemplatingEngine = ejsEngine,
): string {
  return engine.render(template, vars);
}
