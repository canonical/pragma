/**
 * Formatters for `skill list` and `skill lookup`.
 */

import type { Formatters } from "../../kernel/spec/types.js";
import type { DiscoveredSkill } from "./discover.js";
import type { SkillLookup } from "./verbs.js";

export const skillListFormatters: Formatters<DiscoveredSkill[]> = {
  plain: (skills) =>
    skills
      .map(
        (s) =>
          `${s.name}${s.frontmatter.prompt ? " (prompt)" : ""}  ${s.description}`,
      )
      .join("\n"),
  llm: (skills) =>
    [
      `## Skills (${skills.length})`,
      "",
      ...skills.map(
        (s) =>
          `- **${s.name}**${s.frontmatter.prompt ? " (prompt)" : ""} — ${s.description}`,
      ),
    ].join("\n"),
  json: (skills) => JSON.stringify(skills, null, 2),
};

export const skillLookupFormatters: Formatters<SkillLookup> = {
  plain(skill) {
    const lines = [
      skill.name,
      "═".repeat(Math.max(skill.name.length, 24)),
      "",
      `  ${skill.description}`,
    ];
    if (skill.frontmatter.prompt) lines.push("  registers as an MCP prompt");
    if (skill.frontmatter.license) {
      lines.push(`  license: ${skill.frontmatter.license}`);
    }
    if (skill.instructions) lines.push("", skill.instructions);
    return lines.join("\n");
  },
  llm(skill) {
    const lines = [`## ${skill.name}`, "", skill.description, ""];
    if (skill.instructions) lines.push(skill.instructions);
    return lines.join("\n").trimEnd();
  },
  json: (skill) => JSON.stringify(skill, null, 2),
};
