/**
 * Three-mode formatter for `pragma token list` output.
 *
 * - **plain** — one line per token showing name and optional category.
 * - **llm** — condensed Markdown consumed by LLM agents and reused
 *   by the MCP adapter when `condensed: true`.
 * - **json** — structured JSON array for programmatic consumption.
 */

import type { Formatters } from "../../shared/formatters.js";
import type { TokenSummary } from "../../shared/types.js";

const formatters: Formatters<TokenSummary[]> = {
  plain: (tokens) => {
    const lines: string[] = [];
    for (const t of tokens) {
      const cat = t.category ? ` [${t.category}]` : "";
      lines.push(`${t.name}${cat}`);
    }
    return lines.join("\n");
  },

  llm: (tokens) => {
    const lines: string[] = [];
    lines.push("## Design Tokens");
    lines.push("");
    for (const t of tokens) {
      const cat = t.category ? ` [${t.category}]` : "";
      lines.push(`- **${t.name}**${cat}`);
    }
    return lines.join("\n");
  },

  json: (tokens) => JSON.stringify(tokens, null, 2),
};

export default formatters;
