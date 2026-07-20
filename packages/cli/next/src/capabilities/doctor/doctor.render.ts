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

import chalk from "chalk";
import { defaultStyle, type RenderStyle } from "../../kernel/render/style.js";
import type { Formatters } from "../../kernel/spec/types.js";
import type { CheckResult, CheckStatus, DoctorData } from "./types.js";

/** Uncolored status glyphs — tinted at render time (never baked at module load). */
const STATUS_GLYPHS: Record<CheckStatus, string> = {
  pass: "✓",
  fail: "✗",
  skip: "○",
};

const SUB_BULLET = "·";
const FIX_ARROW = "↳";
const INDENT = "     "; // aligns sub-lines under the check name

/** The TTY styler plus `red` — the one tint {@link RenderStyle} does not carry. */
interface DoctorStyle extends RenderStyle {
  red(text: string): string;
}

/**
 * Build the doctor styler for this process's stdout: the shared TTY seam, plus a
 * `red` gated on the SAME decision, so a fail tint appears only on a color TTY.
 *
 * @returns A colorizing styler on a color-capable TTY, else the identity styler.
 * @note Impure — {@link defaultStyle} reads `process.stdout.isTTY` + chalk level.
 */
function doctorStyle(): DoctorStyle {
  const style = defaultStyle();
  return {
    ...style,
    red: style.enabled ? (text) => chalk.red(text) : (text) => text,
  };
}

/** Tint a status glyph by meaning — green pass, red fail, yellow skip. */
function paintGlyph(status: CheckStatus, style: DoctorStyle): string {
  const glyph = STATUS_GLYPHS[status];
  if (status === "pass") return style.green(glyph);
  if (status === "fail") return style.red(glyph);
  return style.yellow(glyph);
}

/**
 * Render one check as terminal lines: a headline row (icon, aligned name,
 * detail), an optional indented breakdown of sub-items, and — for failures — an
 * inline remedial instruction.
 */
function formatCheckPlain(
  check: CheckResult,
  nameWidth: number,
  style: DoctorStyle,
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
        `${INDENT}${style.dim(SUB_BULLET)} ${icon}${itemLabel}${detail}`,
      );
    }
  }

  if (check.status === "fail" && check.remedy) {
    lines.push(
      `${INDENT}${style.cyan(FIX_ARROW)} ${style.cyan("fix:")} ${check.remedy}`,
    );
  }

  return lines;
}

/** Render the pass/fail/skip tally, coloring non-zero fail/skip. */
function formatSummary(data: DoctorData, style: DoctorStyle): string {
  const parts = [style.green(`${data.passed} passed`)];
  parts.push(
    data.failed > 0
      ? style.red(`${data.failed} failed`)
      : style.dim(`${data.failed} failed`),
  );
  parts.push(
    data.skipped > 0
      ? style.yellow(`${data.skipped} skipped`)
      : style.dim(`${data.skipped} skipped`),
  );
  return `  ${parts.join(style.dim(" · "))}`;
}

export const doctorFormatters: Formatters<DoctorData> = {
  plain(data) {
    const style = doctorStyle();
    const nameWidth = Math.max(...data.checks.map((c) => c.name.length), 0);
    const lines: string[] = [style.bold("pragma doctor"), ""];
    for (const check of data.checks) {
      lines.push(...formatCheckPlain(check, nameWidth, style));
    }
    lines.push("", formatSummary(data, style));
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
