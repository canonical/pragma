/**
 * Formatters for `pragma doctor` output.
 *
 * Pure functions: DoctorData → string.
 */

import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type { CheckResult, DoctorData } from "../operations/types.js";

const STATUS_ICONS = {
  pass: chalk.green("✓"),
  fail: chalk.red("✗"),
  skip: chalk.yellow("○"),
} as const;

function formatCheckPlain(check: CheckResult): string {
  return `${STATUS_ICONS[check.status]} ${check.name} ${chalk.dim(check.detail)}`;
}

const formatters: Formatters<DoctorData> = {
  plain(data) {
    const lines: string[] = [];

    for (const check of data.checks) {
      lines.push(formatCheckPlain(check));
    }

    const remedies = data.checks.filter(
      (c): c is CheckResult & { remedy: string } =>
        c.status === "fail" && c.remedy !== undefined,
    );

    if (remedies.length > 0) {
      lines.push("");
      for (const r of remedies) {
        lines.push(
          `Run ${chalk.cyan(`\`${r.remedy}\``)} to fix ${chalk.dim(r.name)}.`,
        );
      }
    }

    return lines.join("\n");
  },

  llm(data) {
    const lines: string[] = [];

    lines.push("## Doctor");
    lines.push("");

    for (const check of data.checks) {
      const icon =
        check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "○";
      lines.push(`- ${icon} **${check.name}**: ${check.detail}`);
    }

    const remedies = data.checks.filter((c) => c.status === "fail" && c.remedy);

    if (remedies.length > 0) {
      lines.push("");
      lines.push("### Remedial");
      for (const r of remedies) {
        lines.push(`- \`${r.remedy}\``);
      }
    }

    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data, null, 2);
  },
};

export default formatters;
