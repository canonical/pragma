/**
 * Formatters for `pragma standard categories` output.
 *
 * Pure functions: CategorySummary[] → string.
 */

import type { Formatters } from "../../shared/formatters.js";
import type { CategorySummary } from "../../shared/types.js";

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
