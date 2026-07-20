/**
 * Formatters for `pragma doctor` — plain (chalk), llm (Markdown), json.
 *
 * Ported from the old shell's `doctor/formatters/doctor.ts`, retargeted at the
 * kernel `Formatters` contract.
 */

import chalk from "chalk";
import type { Formatters } from "../../kernel/spec/types.js";
import { BAND_LABELS } from "../shared/bands.js";
import type { CheckResult, CheckStatus, DoctorData } from "./types.js";

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
 * detail), an optional indented breakdown of sub-items, and — for failures — an
 * inline remedial instruction.
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
 * Partition checks into ordered bands: environment (no band), then the global
 * and project bands. Declaration order is preserved within each band, so the
 * report stays deterministic.
 */
function partitionByBand(checks: readonly CheckResult[]): {
  environment: CheckResult[];
  machine: CheckResult[];
  project: CheckResult[];
} {
  return {
    environment: checks.filter((c) => c.band === undefined),
    machine: checks.filter((c) => c.band === "global"),
    project: checks.filter((c) => c.band === "project"),
  };
}

export const doctorFormatters: Formatters<DoctorData> = {
  plain(data) {
    const nameWidth = Math.max(...data.checks.map((c) => c.name.length), 0);
    const lines: string[] = [chalk.bold("pragma doctor"), ""];
    const { environment, machine, project } = partitionByBand(data.checks);
    const section = (heading: string, checks: CheckResult[]): void => {
      if (checks.length === 0) return;
      if (heading) lines.push(chalk.bold(heading));
      for (const check of checks)
        lines.push(...formatCheckPlain(check, nameWidth));
      lines.push("");
    };
    // Environment checks lead (no header); the global then project bands are the
    // two banded sections before the tally.
    section("", environment);
    section(BAND_LABELS.global, machine);
    section(BAND_LABELS.project, project);
    lines.push(formatSummary(data));
    return lines.join("\n");
  },

  llm(data) {
    const renderCheck = (check: CheckResult): string[] => {
      const icon =
        check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "○";
      const out = [`- ${icon} **${check.name}**: ${check.detail}`];
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
        out.push(`  - ${itemIcon}${item.label}${detail}`);
      }
      if (check.status === "fail" && check.remedy) {
        out.push(`  - _fix:_ \`${check.remedy}\``);
      }
      return out;
    };

    const lines: string[] = ["## Doctor", ""];
    const { environment, machine, project } = partitionByBand(data.checks);
    const section = (heading: string, checks: CheckResult[]): void => {
      if (checks.length === 0) return;
      if (heading) lines.push(`### ${heading}`, "");
      for (const check of checks) lines.push(...renderCheck(check));
    };
    section("", environment);
    section(BAND_LABELS.global, machine);
    section(BAND_LABELS.project, project);
    lines.push(
      "",
      `_${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped_`,
    );
    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
