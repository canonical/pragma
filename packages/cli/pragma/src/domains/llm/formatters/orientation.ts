/**
 * Render the `pragma llm` orientation output.
 *
 * Single output mode — condensed Markdown designed for LLM context.
 * Budget: ≤800 tokens (LO.05).
 */

import type { LlmData } from "../types.js";

export default function renderLlmOrientation(data: LlmData): string {
  const lines: string[] = [];

  // --- Context block (LO.02) ---
  const { context: ctx } = data;
  const tierDisplay = ctx.tier
    ? `${ctx.tier} (${ctx.tierChain.join(" → ")})`
    : "(none)";

  lines.push("# Pragma — Design System CLI");
  lines.push("");
  lines.push("## Context");
  lines.push(`tier: ${tierDisplay} | channel: ${ctx.channel}`);
  lines.push(
    `data: ${ctx.counts.components} components, ${ctx.counts.standards} standards, ${ctx.counts.modifierFamilies} modifier families, ${ctx.counts.tokens} tokens`,
  );
  lines.push(`namespaces: ${ctx.namespaces.join(", ")}`);
  lines.push("");

  // --- Decision trees (LO.03) ---
  lines.push("## Decision Trees");
  lines.push("");
  for (const tree of data.decisionTrees) {
    lines.push(`### ${tree.intent}`);
    lines.push("```");
    lines.push(tree.tree);
    lines.push("```");
    lines.push("");
  }

  // --- Command reference (LO.04) ---
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
