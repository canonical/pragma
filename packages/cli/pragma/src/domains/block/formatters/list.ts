/**
 * Three-mode formatter for `pragma block list` output.
 *
 * - **plain** — styled terminal output with chalk; one line per block
 *   showing name, tier, modifiers, and available implementations.
 * - **llm** — condensed Markdown consumed by LLM agents and reused
 *   by the MCP adapter when `condensed: true`.
 * - **json** — structured JSON array for programmatic consumption.
 */

import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type { BlockSummary } from "../../shared/types.js";

const formatters: Formatters<readonly BlockSummary[]> = {
  plain(components) {
    const lines: string[] = [];

    for (const c of components) {
      const tier = chalk.dim(`[${c.tier}]`);
      const mods =
        c.modifiers.length > 0 ? chalk.dim(` (${c.modifiers.join(", ")})`) : "";
      const impl = c.implementations
        .filter((i) => i.available)
        .map((i) => i.framework);
      const implStr = impl.length > 0 ? chalk.dim(` → ${impl.join(", ")}`) : "";

      lines.push(`${chalk.bold(c.name)} ${tier}${mods}${implStr}`);
    }

    return lines.join("\n");
  },

  llm(components) {
    const lines: string[] = [];

    lines.push("## Blocks");
    lines.push("");

    for (const c of components) {
      const parts = [`**${c.name}**`, `tier: ${c.tier}`];
      if (c.modifiers.length > 0) {
        parts.push(`modifiers: ${c.modifiers.join(", ")}`);
      }
      const impl = c.implementations
        .filter((i) => i.available)
        .map((i) => i.framework);
      if (impl.length > 0) {
        parts.push(`implementations: ${impl.join(", ")}`);
      }
      if (c.nodeCount > 0) parts.push(`nodes: ${c.nodeCount}`);
      if (c.tokenCount > 0) parts.push(`tokens: ${c.tokenCount}`);
      lines.push(`- ${parts.join(" | ")}`);
    }

    return lines.join("\n");
  },

  json(components) {
    return JSON.stringify(components, null, 2);
  },
};

export default formatters;
