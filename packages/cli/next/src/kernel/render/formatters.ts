/**
 * Formatter selection for the CLI projector.
 *
 * The grammar's {@link Formatters} (plain / llm / json — no ink field) is the
 * per-verb output contract. {@link selectFormatter} picks one by the parsed
 * global flags with a fixed precedence: `--format json` wins, then the llm mode
 * (`--format llm` or auto-detected on a non-interactive stdout), then the plain
 * terminal default. The dispatcher uses the plain/llm branches directly and
 * wraps the json branch in the machine envelope (D3).
 */

import type { GlobalFlags } from "../runtime/types.js";
import type { Formatters } from "../spec/types.js";

/**
 * Pick the formatter for the active output mode.
 *
 * Precedence: `--format json` > llm (`--format llm` / auto-detected) > plain.
 *
 * @param flags - The parsed global flags for this invocation.
 * @param formatters - The verb's three-mode formatter set.
 * @returns The single formatter matching the active mode.
 */
export function selectFormatter<T>(
  flags: GlobalFlags,
  formatters: Formatters<T>,
): (data: T) => string {
  if (flags.format === "json") return formatters.json;
  if (flags.llm) return formatters.llm;
  return formatters.plain;
}
