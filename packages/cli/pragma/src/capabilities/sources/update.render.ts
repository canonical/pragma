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
    ];
    for (const pack of data.packs) {
      // FILES, not usable stories: `sources update` carries them verbatim and
      // never validates them (zod would have to run per record, in the build).
      // `doctor` is where "2 stories ignored" comes from — saying "stories"
      // here would put a green count next to a broken file.
      const stories =
        pack.storyCount > 0
          ? `, ${pack.storyCount} story file${pack.storyCount === 1 ? "" : "s"}`
          : "";
      lines.push(
        `  ${pack.name} @ ${pack.resolved.slice(0, 12)} (${pack.sourceCount} source${pack.sourceCount === 1 ? "" : "s"}${stories})`,
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
