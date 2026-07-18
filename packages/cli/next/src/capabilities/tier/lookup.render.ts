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
    const lines = [`${data.name} (${data.uri})`];
    lines.push(
      data.blocks.length > 0
        ? `  blocks: ${data.blocks.join(", ")}`
        : "  blocks: (none scoped directly to this tier)",
    );
    return lines.join("\n");
  },
  llm(data) {
    const lines = [`# ${data.name}`, `- IRI: \`${data.uri}\``];
    if (data.blocks.length > 0) {
      lines.push(`- Blocks: ${data.blocks.map((b) => `\`${b}\``).join(", ")}`);
    }
    return lines.join("\n");
  },
  json(data) {
    return JSON.stringify(data);
  },
};
