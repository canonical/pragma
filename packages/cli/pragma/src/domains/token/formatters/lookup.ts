/**
 * Three-mode formatter factory for `pragma token lookup` output.
 *
 * - **plain** — terminal text showing token name, category, and optional
 *   per-theme values when detailed.
 * - **llm** — condensed Markdown consumed by LLM agents and reused
 *   by the MCP adapter when `condensed: true`.
 * - **json** — structured JSON; omits values unless detailed.
 */

import type { Formatters } from "../../shared/formatters.js";
import type { TokenDetailed } from "../../shared/types.js";

/** Options controlling detail level for the token-lookup formatter. */
export interface TokenLookupFormatterOptions {
  readonly detailed: boolean;
}

/**
 * Creates a three-mode formatter set for a single token, capturing the
 * detail level in the closure so callers only pass the token data.
 *
 * @param options - detail-level options
 * @returns plain/llm/json formatters for {@link TokenDetailed}
 */
export function createLookupFormatters(
  options: TokenLookupFormatterOptions,
): Formatters<TokenDetailed> {
  const { detailed } = options;

  return {
    plain: (token) => {
      const lines: string[] = [];
      lines.push(token.name);
      lines.push(`Category: ${token.category || "—"}`);

      if (detailed && token.values.length > 0) {
        lines.push("");
        lines.push("Values:");
        for (const v of token.values) {
          lines.push(`  ${v.theme}: ${v.value}`);
        }
      }

      return lines.join("\n");
    },

    llm: (token) => {
      const lines: string[] = [];
      lines.push(`## ${token.name}`);
      lines.push(`Category: ${token.category || "—"}`);

      if (detailed && token.values.length > 0) {
        lines.push("");
        lines.push("### Values");
        for (const v of token.values) {
          lines.push(`- ${v.theme}: \`${v.value}\``);
        }
      }

      return lines.join("\n");
    },

    json: (token) => {
      if (detailed) {
        return JSON.stringify(token, null, 2);
      }
      const { values: _values, ...summary } = token;
      return JSON.stringify(summary, null, 2);
    },
  };
}
