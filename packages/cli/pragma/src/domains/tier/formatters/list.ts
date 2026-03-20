import type { Formatters } from "../../shared/formatters.js";
import type { TierEntry } from "../../shared/types.js";

const formatters: Formatters<TierEntry[]> = {
  plain: (tiers) => {
    const lines: string[] = [];
    for (const t of tiers) {
      const indent = "  ".repeat(t.depth);
      const parent = t.parent ? ` (parent: ${t.parent})` : "";
      lines.push(`${indent}${t.path}${parent}`);
    }
    return lines.join("\n");
  },

  llm: (tiers) => {
    const lines: string[] = [];
    lines.push("## Tiers");
    lines.push("");
    for (const t of tiers) {
      const indent = "  ".repeat(t.depth);
      const parent = t.parent ? ` (parent: ${t.parent})` : "";
      lines.push(`${indent}- **${t.path}**${parent}`);
    }
    return lines.join("\n");
  },

  json: (tiers) => JSON.stringify(tiers, null, 2),
};

export default formatters;
