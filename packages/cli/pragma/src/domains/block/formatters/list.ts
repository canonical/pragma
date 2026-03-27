import type { Formatters } from "../../shared/formatters.js";
import { renderListPlain } from "../../shared/renderers.js";
import type { BlockSummary } from "../../shared/types/index.js";
import { blockConfig } from "../blockConfig.js";

/** Three-mode formatter for `pragma block list` output. */
const formatters: Formatters<readonly BlockSummary[]> = {
  plain: (blocks) =>
    renderListPlain(blocks, {
      heading: "Blocks",
      columns: blockConfig.listColumns,
    }),

  llm(blocks) {
    const lines = ["## Blocks", ""];

    for (const block of blocks) {
      const parts = [`**${block.name}**`, `tier: ${block.tier}`];

      if (block.modifiers.length > 0) {
        parts.push(`modifiers: ${block.modifiers.join(", ")}`);
      }

      const implementations = block.implementations
        .filter((implementation) => implementation.available)
        .map((implementation) => implementation.framework);
      if (implementations.length > 0) {
        parts.push(`implementations: ${implementations.join(", ")}`);
      }

      if (block.nodeCount > 0) {
        parts.push(`nodes: ${block.nodeCount}`);
      }

      if (block.tokenCount > 0) {
        parts.push(`tokens: ${block.tokenCount}`);
      }

      lines.push(`- ${parts.join(" | ")}`);
    }

    return lines.join("\n");
  },

  json(components) {
    return JSON.stringify(components, null, 2);
  },
};

export default formatters;
