import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type { DiscoveredSkill } from "../types.js";
import type { SkillListInput } from "./types.js";

/**
 * Group discovered skills by their source package name.
 *
 * @param skills - Skills to group.
 * @returns A Map keyed by package name.
 */
function groupBySource(
  skills: readonly DiscoveredSkill[],
): Map<string, DiscoveredSkill[]> {
  const groups = new Map<string, DiscoveredSkill[]>();
  for (const skill of skills) {
    const group = groups.get(skill.sourcePackage) ?? [];
    group.push(skill);
    groups.set(skill.sourcePackage, group);
  }
  return groups;
}

/**
 * Formatters for `pragma skill list` output.
 *
 * - **plain** renders skills grouped by source package with chalk styling.
 * - **llm** renders a markdown document with package headings.
 * - **json** serializes a flat skill array with metadata.
 */
const formatters: Formatters<SkillListInput> = {
  plain({ skills, sources, detailed }) {
    const lines: string[] = [];
    const grouped = groupBySource(skills);

    for (const [pkg, pkgSkills] of grouped) {
      lines.push(`  ${chalk.dim(pkg)}`);
      for (const skill of pkgSkills) {
        const desc = chalk.dim(skill.description);
        lines.push(`    ${chalk.bold(skill.name.padEnd(22))}${desc}`);

        if (detailed) {
          const fm = skill.frontmatter;
          if (fm.license) {
            lines.push(`      License:         ${fm.license}`);
          }
          if (fm.compatibility?.length) {
            lines.push(`      Compatibility:  ${fm.compatibility.join(", ")}`);
          }
          if (fm.metadata) {
            for (const [key, value] of Object.entries(fm.metadata)) {
              const label = key.charAt(0).toUpperCase() + key.slice(1);
              lines.push(`      ${label.padEnd(16)}${String(value)}`);
            }
          }
          lines.push(`      Source:         ${skill.sourcePath}`);
        }
      }
      lines.push("");
    }

    const unavailable = sources.filter((s) => !s.available);
    for (const source of unavailable) {
      lines.push(
        chalk.dim(
          `  ${source.packageName} not installed (no skills from this source)`,
        ),
      );
    }

    const total = `${skills.length} skill${skills.length === 1 ? "" : "s"}`;
    const pkgCount = grouped.size;
    const pkgs = `${pkgCount} package${pkgCount === 1 ? "" : "s"}`;
    lines.push(`${total} from ${pkgs}`);

    return lines.join("\n");
  },

  llm({ skills, sources }) {
    const lines: string[] = [];
    const grouped = groupBySource(skills);

    lines.push("## Skills");
    lines.push("");

    for (const [pkg, pkgSkills] of grouped) {
      lines.push(`### ${pkg}`);
      for (const skill of pkgSkills) {
        lines.push(`- **${skill.name}** — ${skill.description}`);
      }
      lines.push("");
    }

    const unavailable = sources.filter((s) => !s.available);
    if (unavailable.length > 0) {
      lines.push(
        `*Not installed: ${unavailable.map((s) => s.packageName).join(", ")}*`,
      );
    }

    return lines.join("\n");
  },

  json({ skills }) {
    return JSON.stringify(
      skills.map((s) => ({
        name: s.name,
        description: s.description,
        source: s.sourcePackage,
        path: s.sourcePath,
        metadata: s.frontmatter.metadata ?? {},
      })),
      null,
      2,
    );
  },
};

export default formatters;
