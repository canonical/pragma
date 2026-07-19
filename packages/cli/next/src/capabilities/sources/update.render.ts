/**
 * Formatters for `pragma sources update` — plain, llm, json.
 */

import type { Formatters } from "../../kernel/spec/types.js";
import type { SourcesUpdateData } from "./types.js";

export const updateFormatters: Formatters<SourcesUpdateData> = {
  plain(data) {
    const lines = [
      data.reused
        ? `Store up to date (pack ${data.contentHash.slice(0, 12)}).`
        : `Built pack ${data.contentHash.slice(0, 12)}.`,
      `Wrote ${data.lockPath}.`,
    ];
    for (const pack of data.packs) {
      lines.push(
        `  ${pack.name} @ ${pack.resolved.slice(0, 12)} (${pack.sourceCount} source${pack.sourceCount === 1 ? "" : "s"})`,
      );
    }
    return lines.join("\n");
  },

  llm(data) {
    return [
      `# sources update`,
      `- Pack: ${data.contentHash.slice(0, 12)}${data.reused ? " (reused)" : ""}`,
      ...data.packs.map((pack) => `- ${pack.name}: ${pack.resolved}`),
    ].join("\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
