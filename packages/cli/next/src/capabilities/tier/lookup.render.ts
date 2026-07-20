/**
 * Formatters + data shape for `tier lookup <name>`.
 */

import type { Formatters } from "../../kernel/spec/types.js";

/** The looked-up tier: its IRI, name, and the blocks scoped directly to it. */
export interface TierLookupData {
  readonly uri: string;
  readonly name: string;
  readonly blocks: readonly string[];
}

export const tierLookupFormatters: Formatters<TierLookupData> = {
  plain(data) {
    // Match the shared `renderLookupPlain` frame (title, ═ rule, blank, fields)
    // so a bespoke lookup reads identically to the generic ones (B7).
    const title = `${data.name} (${data.uri})`;
    const rule = "═".repeat(Math.max(title.length, 24));
    const blocks =
      data.blocks.length > 0
        ? `  blocks: ${data.blocks.join(", ")}`
        : "  blocks: (none scoped directly to this tier)";
    return [title, rule, "", blocks].join("\n");
  },
  llm(data) {
    // H2 for an entity read — consistent with block/skill/ontology/graph
    // inspect (the shared `renderLookupLlm` emits `## title`) (B2).
    const lines = [`## ${data.name}`, `- IRI: \`${data.uri}\``];
    if (data.blocks.length > 0) {
      lines.push(`- Blocks: ${data.blocks.map((b) => `\`${b}\``).join(", ")}`);
    }
    return lines.join("\n");
  },
  json(data) {
    return JSON.stringify(data);
  },
};
