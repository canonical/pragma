/**
 * Formatters + data shape for `tier lookup <name>`.
 */

import type { RenderLookupOptions } from "../../kernel/render/contracts.js";
import { renderLookupPlain } from "../../kernel/render/renderers.js";
import type { Formatters } from "../../kernel/spec/types.js";

/** The looked-up tier: its IRI, name, and the blocks scoped directly to it. */
export interface TierLookupData {
  readonly uri: string;
  readonly name: string;
  readonly blocks: readonly string[];
}

/**
 * The shared plain-lookup layout for a tier: a `name (uri)` title over an ═ rule,
 * then the directly-scoped blocks as one inline field. Delegating to
 * {@link renderLookupPlain} single-sources the frame AND the TTY styling (bold
 * title, dim rule, cyan label) that block/skill lookups already earn — so a tier
 * title no longer stays unstyled on a terminal while theirs are bold (B7).
 */
const tierPlainOptions: RenderLookupOptions<TierLookupData> = {
  title: (tier) => `${tier.name} (${tier.uri})`,
  fields: [
    {
      label: "blocks",
      // Pre-joined so the empty case still renders (the shared field renderer
      // skips an empty array). Blocks are `ds:name` display strings, never IRIs,
      // so the shared renderer's URI compaction is a no-op here — byte-stable.
      value: (tier) =>
        tier.blocks.length > 0
          ? tier.blocks.join(", ")
          : "(none scoped directly to this tier)",
    },
  ],
  sections: [],
};

export const tierLookupFormatters: Formatters<TierLookupData> = {
  plain(data) {
    return renderLookupPlain(data, tierPlainOptions);
  },
  llm(data) {
    // A byte-frozen agent contract that DIVERGES from the generic
    // `renderLookupLlm`: an H2 `name` title (not `name (uri)`) with the IRI and
    // blocks backtick-wrapped (`\`cs:…\``) — a shape the shared renderer does not
    // emit. The llm path is never styled, so it has no TTY drift to single-source;
    // kept inline so the frozen bytes hold (B2).
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
