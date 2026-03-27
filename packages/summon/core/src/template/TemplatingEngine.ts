/**
 * Abstract interface for templating engines.
 *
 * Implement this interface to use alternative template engines
 * (e.g., Handlebars, Mustache, Nunjucks) with the summon generator.
 */
export default interface TemplatingEngine {
  /** Render a template string with variables (synchronous). */
  render(template: string, vars: Record<string, unknown>): string;
  /** Render a template string with variables (asynchronous). */
  renderAsync(template: string, vars: Record<string, unknown>): Promise<string>;
  /** Render a template file with variables (asynchronous). */
  renderFile(
    templatePath: string,
    vars: Record<string, unknown>,
  ): Promise<string>;
}
