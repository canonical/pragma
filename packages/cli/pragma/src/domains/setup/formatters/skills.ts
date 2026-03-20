/**
 * Formatters for `pragma setup skills` output.
 *
 * Pure functions: SetupSkillsOutput → string.
 */

import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type { SetupSkillsOutput } from "./types.js";

const formatters: Formatters<SetupSkillsOutput> = {
  plain({ result, dryRun }) {
    const lines: string[] = [];
    const prefix = dryRun ? "Would create" : "Created";

    const created = result.actions.filter((a) => a.action === "created");
    const skipped = result.actions.filter((a) => a.action === "skipped");
    const replaced = result.actions.filter((a) => a.action === "replaced");

    if (created.length > 0) {
      const byHarness = groupByHarness(created.map((a) => a));
      for (const [harness, actions] of byHarness) {
        const count = actions.length;
        lines.push(
          `${chalk.green("✓")} ${prefix} ${count} symlink${count === 1 ? "" : "s"} for ${harness}`,
        );
      }
    }

    if (skipped.length > 0) {
      lines.push(
        chalk.dim(
          `  ${skipped.length} existing symlink${skipped.length === 1 ? "" : "s"} unchanged`,
        ),
      );
    }

    if (replaced.length > 0) {
      for (const action of replaced) {
        lines.push(
          chalk.yellow(
            `  ⚠ Replaced symlink for ${action.skillName} in ${action.harnessName}`,
          ),
        );
      }
    }

    for (const warning of result.warnings) {
      lines.push(chalk.yellow(`  ⚠ ${warning}`));
    }

    return lines.join("\n");
  },

  llm({ result, dryRun }) {
    const lines: string[] = [];
    const verb = dryRun ? "Would symlink" : "Symlinked";

    lines.push(`## Setup Skills`);
    lines.push("");

    const created = result.actions.filter((a) => a.action === "created");
    const skipped = result.actions.filter((a) => a.action === "skipped");

    if (created.length > 0) {
      lines.push(`${verb} ${created.length} skill(s):`);
      for (const action of created) {
        lines.push(`- **${action.skillName}** → ${action.harnessName}`);
      }
    }

    if (skipped.length > 0) {
      lines.push("");
      lines.push(`${skipped.length} already up to date.`);
    }

    if (result.warnings.length > 0) {
      lines.push("");
      lines.push("### Warnings");
      for (const w of result.warnings) {
        lines.push(`- ${w}`);
      }
    }

    return lines.join("\n");
  },

  json({ result }) {
    return JSON.stringify(result, null, 2);
  },
};

function groupByHarness(
  actions: readonly { harnessName: string }[],
): Map<string, typeof actions> {
  const groups = new Map<string, (typeof actions)[number][]>();
  for (const action of actions) {
    const group = groups.get(action.harnessName) ?? [];
    group.push(action);
    groups.set(action.harnessName, group);
  }
  return groups;
}

export default formatters;
