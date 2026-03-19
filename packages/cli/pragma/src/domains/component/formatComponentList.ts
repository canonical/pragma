/**
 * Format component list results for different output modes.
 *
 * Pure functions: ComponentSummary[] → string.
 */

import chalk from "chalk";
import type { ComponentSummary } from "../shared/types.js";

/**
 * Format component list as plain terminal output.
 */
export default function formatComponentList(
  components: readonly ComponentSummary[],
): string {
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
}

/**
 * Format component list as LLM-friendly Markdown.
 */
export function formatComponentListLlm(
  components: readonly ComponentSummary[],
): string {
  const lines: string[] = [];

  lines.push("## Components");
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
}

/**
 * Format component list as JSON.
 */
export function formatComponentListJson(
  components: readonly ComponentSummary[],
): string {
  return JSON.stringify(components, null, 2);
}
