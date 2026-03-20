/**
 * Formatters for `pragma standard list` output.
 *
 * Pure functions: StandardSummary[] → string.
 */

import type { Formatters } from "../../shared/formatters.js";
import type { StandardSummary } from "../../shared/types.js";

const formatters: Formatters<readonly StandardSummary[]> = {
  plain(standards) {
    const lines: string[] = [];
    for (const s of standards) {
      const cat = s.category ? ` [${s.category}]` : "";
      lines.push(`${s.name}${cat}`);
      lines.push(`  ${s.description}`);
    }
    return lines.join("\n");
  },

  llm(standards) {
    const lines: string[] = [];
    lines.push("## Standards");
    lines.push("");
    for (const s of standards) {
      const cat = s.category ? ` [${s.category}]` : "";
      lines.push(`- **${s.name}**${cat}: ${s.description}`);
    }
    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data, null, 2);
  },
};

export default formatters;
