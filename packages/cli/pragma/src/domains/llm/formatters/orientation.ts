import type { LlmData } from "../types.js";

/**
 * Renders the `pragma llm` orientation document.
 *
 * Produces a single condensed Markdown output (budget: <=800 tokens) containing
 * context summary, decision trees, and a command reference table.
 *
 * @param data - The assembled LLM orientation data.
 * @returns A Markdown string for LLM context injection.
 */
export default function renderLlmOrientation(data: LlmData): string {
  const lines: string[] = [];

  // --- Context block ---
  const { context: ctx } = data;
  const tierDisplay = ctx.tier
    ? `${ctx.tier} (${ctx.tierChain.join(" → ")})`
    : "(none)";

  lines.push("# Pragma — Design System CLI");
  lines.push("");
  lines.push("## Context");
  lines.push(`tier: ${tierDisplay} | channel: ${ctx.channel}`);
  lines.push(
    `data: ${ctx.counts.blocks} blocks, ${ctx.counts.standards} standards, ${ctx.counts.modifierFamilies} modifier families, ${ctx.counts.tokens} tokens`,
  );
  lines.push(`namespaces: ${ctx.namespaces.join(", ")}`);
  lines.push("");

  // --- Decision trees ---
  lines.push("## Decision Trees");
  lines.push("");
  for (const tree of data.decisionTrees) {
    lines.push(`### ${tree.intent}`);
    lines.push("```");
    lines.push(tree.tree);
    lines.push("```");
    lines.push("");
  }

  // --- Command reference ---
  lines.push("## Commands");
  lines.push("| Command | Tokens |");
  lines.push("|---|---|");
  for (const ref of data.commandReference) {
    lines.push(`| \`${ref.command}\` | ${ref.tokens} |`);
  }
  lines.push("");
  lines.push("Append `--llm` to all commands for token-optimized output.");

  return lines.join("\n");
}
