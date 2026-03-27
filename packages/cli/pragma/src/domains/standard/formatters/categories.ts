/**
 * Three-mode formatter for `pragma standard categories` output.
 *
 * - **plain** — one line per category with standard count.
 * - **llm** — condensed Markdown consumed by LLM agents and reused
 *   by the MCP adapter when `condensed: true`.
 * - **json** — structured JSON array for programmatic consumption.
 */

import type { Formatters } from "../../shared/formatters.js";
import type { CategorySummary } from "../../shared/types/index.js";

const formatters: Formatters<readonly CategorySummary[]> = {
  plain(categories) {
    const lines: string[] = [];
    for (const c of categories) {
      const plural = c.standardCount === 1 ? "standard" : "standards";
      lines.push(`${c.name} (${c.standardCount} ${plural})`);
    }
    return lines.join("\n");
  },

  llm(categories) {
    const lines: string[] = [];
    lines.push("## Standard Categories");
    lines.push("");
    for (const c of categories) {
      lines.push(`- **${c.name}** (${c.standardCount})`);
    }
    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data, null, 2);
  },
};

export default formatters;
