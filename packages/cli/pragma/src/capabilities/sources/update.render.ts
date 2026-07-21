/**
 * Formatters for `pragma sources update` — plain, llm, json.
 */

import type { Formatters } from "../../kernel/spec/types.js";
import type { SourcesUpdateData } from "./types.js";

/** A skills tally, or null when nothing was linked (so the recap omits it). */
function skillsLine(skills: SourcesUpdateData["skills"]): string | null {
  const { created, replaced, skipped } = skills;
  if (created === 0 && replaced === 0 && skipped === 0) return null;
  return `Skills: ${created} linked, ${replaced} relinked, ${skipped} unchanged.`;
}

export const updateFormatters: Formatters<SourcesUpdateData> = {
  plain(data) {
    const lines = [
      // `reused` = the pack CACHE was hit (its content hash already built), not
      // "nothing changed" — the lock and skill links may still have moved, so
      // the wording names the cache reuse rather than claiming a full no-op.
      data.reused
        ? `Store already built (pack ${data.contentHash.slice(0, 12)} reused).`
        : `Built pack ${data.contentHash.slice(0, 12)}.`,
      `Wrote ${data.lockPath}.`,
    ];
    for (const pack of data.packs) {
      lines.push(
        `  ${pack.name} @ ${pack.resolved.slice(0, 12)} (${pack.sourceCount} source${pack.sourceCount === 1 ? "" : "s"})`,
      );
    }
    const skills = skillsLine(data.skills);
    if (skills) lines.push(skills);
    return lines.join("\n");
  },

  llm(data) {
    const lines = [
      `# sources update`,
      `- Pack: ${data.contentHash.slice(0, 12)}${data.reused ? " (cache reused)" : " (built)"}`,
      ...data.packs.map((pack) => `- ${pack.name}: ${pack.resolved}`),
    ];
    const skills = skillsLine(data.skills);
    if (skills) lines.push(`- ${skills}`);
    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
