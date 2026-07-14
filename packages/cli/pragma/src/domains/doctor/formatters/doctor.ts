import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type {
  CheckResult,
  CheckStatus,
  DoctorData,
} from "../operations/types.js";

/** Status icons for pass/fail/skip results (checks and sub-items). */
const STATUS_ICONS: Record<CheckStatus, string> = {
  pass: chalk.green("✓"),
  fail: chalk.red("✗"),
  skip: chalk.yellow("○"),
};

const SUB_BULLET = chalk.dim("·");
const FIX_ARROW = chalk.cyan("↳");
const INDENT = "     "; // aligns sub-lines under the check name

/**
 * Render one check as terminal lines: a headline row (icon, aligned name,
 * detail), an optional indented breakdown of sub-items, and — for failures —
 * an inline remedial instruction.
 *
 * @param check - The check result to render.
 * @param nameWidth - Width to pad check names to so details align in a column.
 * @returns The lines for this check.
 */
function formatCheckPlain(check: CheckResult, nameWidth: number): string[] {
  const name = check.name.padEnd(nameWidth);
  const label = check.status === "fail" ? chalk.red(name) : chalk.bold(name);
  const lines = [
    `  ${STATUS_ICONS[check.status]}  ${label}  ${chalk.dim(check.detail)}`,
  ];

  if (check.items && check.items.length > 0) {
    const itemWidth = Math.max(...check.items.map((i) => i.label.length));
    const anyStatus = check.items.some((i) => i.status !== undefined);
    for (const item of check.items) {
      const icon = anyStatus
        ? item.status
          ? `${STATUS_ICONS[item.status]} `
          : "  "
        : "";
      const itemLabel = item.detail ? item.label.padEnd(itemWidth) : item.label;
      const detail = item.detail ? `  ${chalk.dim(item.detail)}` : "";
      lines.push(`${INDENT}${SUB_BULLET} ${icon}${itemLabel}${detail}`);
    }
  }

  if (check.status === "fail" && check.remedy) {
    lines.push(`${INDENT}${FIX_ARROW} ${chalk.cyan("fix:")} ${check.remedy}`);
  }

  return lines;
}

/** Render the pass/fail/skip tally, coloring non-zero fail/skip. */
function formatSummary(data: DoctorData): string {
  const parts = [chalk.green(`${data.passed} passed`)];
  parts.push(
    data.failed > 0
      ? chalk.red(`${data.failed} failed`)
      : chalk.dim(`${data.failed} failed`),
  );
  parts.push(
    data.skipped > 0
      ? chalk.yellow(`${data.skipped} skipped`)
      : chalk.dim(`${data.skipped} skipped`),
  );
  return `  ${parts.join(chalk.dim(" · "))}`;
}

/**
 * Formatters for `pragma doctor` output.
 *
 * - **plain** renders an aligned check list with indented sub-items and
 *   inline remedies, followed by a summary tally.
 * - **llm** renders a Markdown list with nested sub-items and inline fixes.
 * - **json** serializes the raw DoctorData (including `items`).
 */
const formatters: Formatters<DoctorData> = {
  plain(data) {
    const nameWidth = Math.max(...data.checks.map((c) => c.name.length), 0);
    const lines: string[] = [chalk.bold("pragma doctor"), ""];

    for (const check of data.checks) {
      lines.push(...formatCheckPlain(check, nameWidth));
    }

    lines.push("");
    lines.push(formatSummary(data));

    return lines.join("\n");
  },

  llm(data) {
    const lines: string[] = ["## Doctor", ""];

    for (const check of data.checks) {
      const icon =
        check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "○";
      lines.push(`- ${icon} **${check.name}**: ${check.detail}`);

      for (const item of check.items ?? []) {
        const itemIcon =
          item.status === "pass"
            ? "✓ "
            : item.status === "fail"
              ? "✗ "
              : item.status === "skip"
                ? "○ "
                : "";
        const detail = item.detail ? `: ${item.detail}` : "";
        lines.push(`  - ${itemIcon}${item.label}${detail}`);
      }

      if (check.status === "fail" && check.remedy) {
        lines.push(`  - _fix:_ \`${check.remedy}\``);
      }
    }

    lines.push("");
    lines.push(
      `_${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped_`,
    );

    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data, null, 2);
  },
};

export default formatters;
