/**
 * Three-mode formatter for `pragma modifier lookup` output.
 *
 * - **plain** — terminal text showing the family name and its values.
 * - **llm** — condensed Markdown consumed by LLM agents and reused
 *   by the MCP adapter when `condensed: true`.
 * - **json** — structured JSON for programmatic consumption.
 */

import type { Formatters } from "../../shared/formatters.js";
import type { ModifierFamily } from "../../shared/types.js";

const formatters: Formatters<ModifierFamily> = {
  plain: (family) => {
    const lines: string[] = [];
    lines.push(family.name);
    lines.push("");
    lines.push("Values:");
    for (const v of family.values) {
      lines.push(`  ${v}`);
    }
    return lines.join("\n");
  },

  llm: (family) => {
    const lines: string[] = [];
    lines.push(`## ${family.name}`);
    lines.push("");
    for (const v of family.values) {
      lines.push(`- ${v}`);
    }
    return lines.join("\n");
  },

  json: (family) => JSON.stringify(family, null, 2),
};

export default formatters;
