import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type { SkillDetailed } from "../types.js";

/**
 * Formatters for `pragma skill lookup` output.
 *
 * - **plain** renders a chalk-styled header (name, source, files) above
 *   the full SKILL.md content.
 * - **llm** renders a markdown header above the content — the skill body
 *   is already markdown, so it is served verbatim.
 * - **json** serializes the skill with its content and companion files.
 */
const formatters: Formatters<SkillDetailed> = {
  plain(skill) {
    const lines: string[] = [
      chalk.bold(skill.name),
      chalk.dim(skill.description),
      chalk.dim(`Source: ${skill.sourcePackage} (${skill.sourcePath})`),
    ];
    if (skill.files.length > 0) {
      lines.push(chalk.dim(`Companion files: ${skill.files.join(", ")}`));
    }
    lines.push("", skill.content);
    return lines.join("\n");
  },

  llm(skill) {
    const lines: string[] = [
      `## Skill: ${skill.name}`,
      "",
      `**Source:** ${skill.sourcePackage} (${skill.folderName})`,
    ];
    if (skill.files.length > 0) {
      lines.push(`**Companion files:** ${skill.files.join(", ")}`);
    }
    lines.push("", skill.content);
    return lines.join("\n");
  },

  json(skill) {
    return JSON.stringify(
      {
        name: skill.name,
        description: skill.description,
        source: skill.sourcePackage,
        path: skill.sourcePath,
        files: skill.files,
        content: skill.content,
      },
      null,
      2,
    );
  },
};

export default formatters;
