/**
 * Formatters for `skill list` and `skill lookup`.
 */

import { renderNextStep } from "../../kernel/spec/call.js";
import type { Formatters, Surface } from "../../kernel/spec/index.js";
import { BUILD_STORE_CALL, LINK_SKILLS_CALL } from "../shared/calls.js";
import type { DiscoveredSkill } from "./discover.js";
import type { SkillLookup } from "./verbs.js";

/** Empty-state guidance (U5) — where skills come from now that packs ship them. */
function describeEmpty(surface: Surface): string {
  return `No skills found.\nSkills come from design-system packs — add one to the project config's packs, build the store, then link the skills. ${renderNextStep(BUILD_STORE_CALL, surface)} ${renderNextStep(LINK_SKILLS_CALL, surface)}`;
}

export const skillListFormatters: Formatters<DiscoveredSkill[]> = {
  // Zero skills: plain stdout stays empty — the guidance is `notice`,
  // which the dispatcher routes to stderr (exit 0) so a pipe reads no prose.
  plain: (skills) =>
    skills
      .map(
        (s) =>
          `${s.name}${s.frontmatter.prompt ? " (prompt)" : ""}  ${s.description}`,
      )
      .join("\n"),
  notice: (skills, surface = "cli") =>
    skills.length === 0 ? describeEmpty(surface) : undefined,
  llm: (skills) =>
    skills.length === 0
      ? `## Skills (0)\n\n${describeEmpty("cli")}`
      : [
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
