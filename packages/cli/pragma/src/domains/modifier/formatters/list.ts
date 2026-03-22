/**
 * Three-mode formatter for `pragma modifier list` output.
 *
 * - **plain** — one line per family showing name and comma-separated values.
 * - **llm** — condensed Markdown consumed by LLM agents and reused
 *   by the MCP adapter when `condensed: true`.
 * - **json** — structured JSON array for programmatic consumption.
 */

import type { Formatters } from "../../shared/formatters.js";
import type { ModifierFamily } from "../../shared/types.js";

const formatters: Formatters<ModifierFamily[]> = {
  plain: (families) => {
    const lines: string[] = [];
    for (const f of families) {
      lines.push(`${f.name}: ${f.values.join(", ")}`);
    }
    return lines.join("\n");
  },

  llm: (families) => {
    const lines: string[] = [];
    lines.push("## Modifier Families");
    lines.push("");
    for (const f of families) {
      lines.push(`- **${f.name}**: ${f.values.join(", ")}`);
    }
    return lines.join("\n");
  },

  json: (families) => JSON.stringify(families, null, 2),
};

export default formatters;
