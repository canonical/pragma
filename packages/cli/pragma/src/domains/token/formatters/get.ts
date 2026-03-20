import type { Formatters } from "../../shared/formatters.js";
import type { TokenDetailed } from "../../shared/types.js";

export interface TokenGetFormatterOptions {
  readonly detailed: boolean;
}

export function createGetFormatters(
  options: TokenGetFormatterOptions,
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
