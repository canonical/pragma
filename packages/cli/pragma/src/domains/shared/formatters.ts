/**
 * Shared formatter infrastructure for CLI output modes.
 *
 * Every command must support three output modes: plain (terminal),
 * llm (condensed Markdown), and json (structured). The `Formatters<T>`
 * type enforces this contract. `selectFormatter` eliminates the
 * duplicated if/else dispatch in every command's execute function.
 */

import type { CommandContext } from "@canonical/cli-core";
import type { LookupResult } from "./contracts.js";

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

interface RenderLookupResultsOptions<TResult, TInput> {
  readonly ctx: CommandContext;
  readonly result: LookupResult<TResult>;
  readonly formatters: Formatters<TInput>;
  readonly mapResult: (item: TResult) => TInput;
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

export function renderLookupResults<TResult, TInput>(
  options: RenderLookupResultsOptions<TResult, TInput>,
): string {
  const { ctx, result, formatters, mapResult } = options;
  const formatOne = selectFormatter(ctx, formatters);

  if (ctx.globalFlags.format === "json") {
    if (result.results.length === 1 && result.errors.length === 0) {
      const only = result.results[0];
      return only
        ? formatters.json(mapResult(only))
        : JSON.stringify({ results: [], errors: result.errors }, null, 2);
    }

    return JSON.stringify(
      {
        results: result.results.map((item) =>
          JSON.parse(formatters.json(mapResult(item))),
        ),
        errors: result.errors,
      },
      null,
      2,
    );
  }

  const parts = result.results.map((item) => formatOne(mapResult(item)));
  if (result.errors.length > 0) {
    const heading = ctx.globalFlags.llm ? "**Errors:**" : "Errors:";
    parts.push(
      [
        heading,
        ...result.errors.flatMap((error) => formatErrorLines(error)),
      ].join("\n"),
    );
  }

  return parts.join("\n\n");
}

/**
 * Render one lookup error as display lines: the query and message, plus any
 * fuzzy-match suggestions carried on the error (which the JSON mode surfaces
 * but the text modes previously dropped).
 *
 * @param error - A single lookup error entry.
 * @returns One or more display lines for this error.
 */
function formatErrorLines(error: {
  query: string;
  message: string;
  suggestions?: readonly string[];
}): string[] {
  const lines = [`- ${error.query}: ${error.message}`];
  if (error.suggestions && error.suggestions.length > 0) {
    lines.push(`  Did you mean: ${error.suggestions.join(", ")}?`);
  }
  return lines;
}
