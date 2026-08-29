/**
 * Formatters for `pragma doctor` — plain (chalk on a TTY), llm (Markdown), json.
 *
 * Ported from the old shell's `doctor/formatters/doctor.ts`, retargeted at the
 * kernel `Formatters` contract. The plain path is colored ONLY on a color-capable
 * TTY: it consults the shared {@link defaultStyle} seam (stdout `isTTY` AND a
 * non-zero chalk level), so a piped / redirected / CI run — where `supports-color`
 * can report a level with no TTY (`GITHUB_ACTIONS`, `FORCE_COLOR`) — renders the
 * plain form byte-for-byte instead of leaking ANSI into `doctor --format plain`.
 * Glyphs are plain constants tinted at render time; nothing is baked at load.
 */

import { BIN_NAME } from "../../constants.js";
import { defaultStyle, type RenderStyle } from "../../kernel/render/style.js";
import {
  CHECK_GLYPHS,
  checkRemedyWord,
  FIX_ARROW,
  SCOPE_LABELS,
  SUB_BULLET,
  SUB_INDENT,
} from "../../kernel/render/vocabulary.js";
import type { Formatters } from "../../kernel/spec/index.js";
import type { CheckResult, CheckStatus, DoctorData } from "./types.js";

/**
 * Tint a status glyph by meaning — green pass, red fail, cyan available
 * (actionable-but-optional, the same tint as the `fix:` arrow it points at),
 * yellow skip.
 */
function paintGlyph(status: CheckStatus, style: RenderStyle): string {
  const glyph = CHECK_GLYPHS[status];
  if (status === "pass") return style.green(glyph);
  if (status === "fail") return style.red(glyph);
  if (status === "available") return style.cyan(glyph);
  return style.yellow(glyph);
}

/**
 * Render one check as terminal lines: a headline row (icon, aligned name,
 * detail), an optional indented breakdown of sub-items, and — whenever the
 * check carries one — an inline instruction.
 */
function formatCheckPlain(
  check: CheckResult,
  nameWidth: number,
  style: RenderStyle,
): string[] {
  const name = check.name.padEnd(nameWidth);
  const label = check.status === "fail" ? style.red(name) : style.bold(name);
  const lines = [
    `  ${paintGlyph(check.status, style)}  ${label}  ${style.dim(check.detail)}`,
  ];

  if (check.items && check.items.length > 0) {
    const itemWidth = Math.max(...check.items.map((i) => i.label.length));
    const anyStatus = check.items.some((i) => i.status !== undefined);
    for (const item of check.items) {
      const icon = anyStatus
        ? item.status
          ? `${paintGlyph(item.status, style)} `
          : "  "
        : "";
      const itemLabel = item.detail ? item.label.padEnd(itemWidth) : item.label;
      const detail = item.detail ? `  ${style.dim(item.detail)}` : "";
      lines.push(
        `${SUB_INDENT}${style.dim(SUB_BULLET)} ${icon}${itemLabel}${detail}`,
      );
    }
  }

  // Every row that HAS an instruction prints it. A fail's remedy is the
  // repair, an available's is the setup command that enables it — and a skip's,
  // when it authored one, is the only thing standing between the reader and a
  // dead end. Skips were dropped here, so `skills` reported "no skills
  // installed" with the next step (`sources update`) computed, carried through
  // the check, published in `--format json`, and then thrown away one line
  // before it reached the person reading. A skip never DERIVES a remedy
  // (`scopedChecks` only passes through an authored one), so this prints
  // nothing that was not deliberately written for this machine.
  if (check.remedy) {
    lines.push(
      `${SUB_INDENT}${style.cyan(FIX_ARROW)} ${style.cyan(`${checkRemedyWord(check.status)}:`)} ${check.remedy}`,
    );
  }

  return lines;
}

/**
 * Render the pass/fail/available/skip tally, coloring the non-zero counts.
 * `available` is counted apart from `failed` so a healthy install with
 * integrations left to opt into never reports failures it does not have.
 */
function formatSummary(data: DoctorData, style: RenderStyle): string {
  const parts = [style.green(`${data.passed} passed`)];
  parts.push(
    data.failed > 0
      ? style.red(`${data.failed} failed`)
      : style.dim(`${data.failed} failed`),
  );
  parts.push(
    data.available > 0
      ? style.cyan(`${data.available} available`)
      : style.dim(`${data.available} available`),
  );
  parts.push(
    data.skipped > 0
      ? style.yellow(`${data.skipped} skipped`)
      : style.dim(`${data.skipped} skipped`),
  );
  return `  ${parts.join(style.dim(" · "))}`;
}

/**
 * Partition checks into ordered sections: environment (no scope), then the
 * global and local-project scopes. Declaration order is preserved within each,
 * so the report stays deterministic.
 */
function partitionByScope(checks: readonly CheckResult[]): {
  environment: CheckResult[];
  global: CheckResult[];
  project: CheckResult[];
} {
  return {
    environment: checks.filter((c) => c.scope === undefined),
    global: checks.filter((c) => c.scope === "global"),
    project: checks.filter((c) => c.scope === "project"),
  };
}

export const doctorFormatters: Formatters<DoctorData> = {
  plain(data) {
    const style = defaultStyle();
    const nameWidth = Math.max(...data.checks.map((c) => c.name.length), 0);
    const lines: string[] = [style.bold(`${BIN_NAME} doctor`), ""];
    const { environment, global, project } = partitionByScope(data.checks);
    const section = (heading: string, checks: CheckResult[]): void => {
      if (checks.length === 0) return;
      if (heading) lines.push(style.bold(heading));
      for (const check of checks)
        lines.push(...formatCheckPlain(check, nameWidth, style));
      lines.push("");
    };
    // Environment checks lead (no header); Global then Local project are the
    // two scoped sections before the tally.
    section("", environment);
    section(SCOPE_LABELS.global, global);
    section(SCOPE_LABELS.project, project);
    lines.push(formatSummary(data, style));
    return lines.join("\n");
  },

  llm(data) {
    const renderCheck = (check: CheckResult): string[] => {
      const out = [
        `- ${CHECK_GLYPHS[check.status]} **${check.name}**: ${check.detail}`,
      ];
      for (const item of check.items ?? []) {
        const itemIcon = item.status ? `${CHECK_GLYPHS[item.status]} ` : "";
        const detail = item.detail ? `: ${item.detail}` : "";
        out.push(`  - ${itemIcon}${item.label}${detail}`);
      }
      // Same rule as the plain path: every row that carries an instruction
      // prints it, under the label its status earns. Only a `fix:` is code-set
      // — a derived remedy is a bare command, while a skip's authored `next:`
      // is a sentence that may quote a command of its own, and wrapping that in
      // backticks nests one code span inside another.
      if (check.remedy) {
        out.push(
          check.status === "skip"
            ? `  - _${checkRemedyWord(check.status)}:_ ${check.remedy}`
            : `  - _${checkRemedyWord(check.status)}:_ \`${check.remedy}\``,
        );
      }
      return out;
    };

    const lines: string[] = ["## Doctor", ""];
    const { environment, global, project } = partitionByScope(data.checks);
    const section = (heading: string, checks: CheckResult[]): void => {
      if (checks.length === 0) return;
      if (heading) lines.push(`### ${heading}`, "");
      for (const check of checks) lines.push(...renderCheck(check));
    };
    section("", environment);
    section(SCOPE_LABELS.global, global);
    section(SCOPE_LABELS.project, project);
    lines.push(
      "",
      `_${data.passed} passed, ${data.failed} failed, ${data.available} available, ${data.skipped} skipped_`,
    );
    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
