import compactUri from "../../shared/compactUri.js";
import type { Formatters } from "../../shared/formatters.js";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import type { TierEntry } from "../../shared/types/index.js";

/**
 * Three-mode formatter for `pragma tier list` output.
 *
 * - **plain** — indented terminal text showing tier hierarchy with
 *   optional parent annotations.
 * - **llm** — condensed Markdown consumed by LLM agents and reused
 *   by the MCP adapter when `condensed: true`.
 * - **json** — structured JSON array for programmatic consumption.
 */
const formatters: Formatters<TierEntry[]> = {
  plain: (tiers) => {
    const lines: string[] = [];
    for (const t of tiers) {
      const indent = "  ".repeat(t.depth);
      const parent = t.parent ? ` (parent: ${t.parent})` : "";
      lines.push(
        `${compactUri(t.uri, PREFIX_MAP)}  ${indent}${t.path}${parent}`,
      );
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
      lines.push(
        `${indent}- **${t.path}** \`${compactUri(t.uri, PREFIX_MAP)}\`${parent}`,
      );
    }
    return lines.join("\n");
  },

  json: (tiers) => JSON.stringify(tiers, null, 2),
};

export default formatters;
