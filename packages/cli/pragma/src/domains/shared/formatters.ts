/**
 * Shared formatter infrastructure for CLI output modes.
 *
 * Every command must support three output modes: plain (terminal),
 * llm (condensed Markdown), and json (structured). The `Formatters<T>`
 * type enforces this contract. `selectFormatter` eliminates the
 * duplicated if/else dispatch in every command's execute function.
 */

import type { CommandContext } from "@canonical/cli-core";

/**
 * The three output modes every command must support.
 *
 * Each formatter is a pure function from data to string.
 */
export interface Formatters<T> {
  readonly plain: (data: T) => string;
  readonly llm: (data: T) => string;
  readonly json: (data: T) => string;
}

/**
 * Pick the right formatter based on global flags.
 *
 * Precedence: `--format json` > `--llm` > plain.
 */
export function selectFormatter<T>(
  ctx: CommandContext,
  formatters: Formatters<T>,
): (data: T) => string {
  if (ctx.globalFlags.format === "json") return formatters.json;
  if (ctx.globalFlags.llm) return formatters.llm;
  return formatters.plain;
}
