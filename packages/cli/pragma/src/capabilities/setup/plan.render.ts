/**
 * The plan's four renders: the preview table, one progress line per row, the
 * recap, and the JSON projection.
 *
 * All four read the SAME {@link SetupPlan}. That is the whole design: a preview
 * that shows one thing, a progress stream that shows another, and a recap that
 * counts a third is how "Setup complete — ran: completions, lsp, mcp" came to
 * be printed on a run that had silently dropped a target. Here the recap is the
 * preview with outcomes filled in, so the two cannot describe different runs.
 *
 * Column widths are computed from the rows being rendered, so the block stays
 * aligned whether it holds one row or seven. Colour rides the shared TTY seam —
 * a piped run renders byte-for-byte plain.
 */

import chalk from "chalk";
import { BIN_NAME } from "../../constants.js";
import { defaultStyle, type RenderStyle } from "../../kernel/render/style.js";
import { BAND_LABELS } from "../shared/bands.js";
import {
  type PlanChildRow,
  type PlanRow,
  planTally,
  type SetupPlan,
  shortenPath,
} from "./plan.js";
import type { ScopeBand } from "./types.js";

/** The glyph for a row's outcome. */
const GLYPHS = {
  done: "✓",
  noop: "✓",
  removed: "✓",
  kept: "○",
  skipped: "○",
  failed: "✗",
} as const;

/**
 * The marker for a row that carries NO outcome — one the user deselected, so it
 * was neither done nor skipped-for-cause. It must not be a ✓: a green check
 * against work that never ran is the same lie the old recap told when it
 * reported "Setup complete" over a target it had dropped.
 */
const NOT_RUN_GLYPH = "·";

/** The TTY styler plus `red` — the one tint {@link RenderStyle} does not carry. */
interface PlanStyle extends RenderStyle {
  red(text: string): string;
}

/**
 * Widen a {@link RenderStyle} with a `red` gated on the SAME colour decision, so
 * a failure tint appears only on a colour-capable TTY. Mirrors `doctor`'s own
 * styler, which is deliberate: a failed setup row and a failed doctor row are
 * the same finding seen twice, and they are tinted alike.
 *
 * @param style - The shared styler.
 * @returns The styler plus `red`.
 */
const withRed = (style: RenderStyle): PlanStyle => ({
  ...style,
  red: style.enabled ? (text) => chalk.red(text) : (text) => text,
});

/** The header's band phrase: `global band`, `project band`, or `both bands`. */
const scopePhrase = (scope: SetupPlan["scope"]): string =>
  scope === "both" ? "both bands" : `${scope} band`;

/**
 * The header line. It names the band and BOTH roots exactly once, which is what
 * frees every row below to render its paths root-relative instead of repeating
 * a 120-character prefix per line.
 */
function header(plan: SetupPlan, lead: string): string {
  const project = shortenPath(plan.roots.project, {
    global: plan.roots.global,
    project: "",
  });
  return `${lead} — ${scopePhrase(plan.scope)} (~ · project: ${project})`;
}

/** The middle column: the per-file count when a row has children, else its action. */
const actionCell = (row: PlanRow): string =>
  row.children && row.children.length > 0 ? row.detail : row.action;

/** One child rendered inline: `~/.claude.json (add)`. */
const childCell = (child: PlanChildRow): string =>
  `${child.label} (${child.action})`;

/** The right column: the children joined, or the row's own detail. */
const detailCell = (row: PlanRow): string =>
  row.children && row.children.length > 0
    ? row.children.map(childCell).join(" · ")
    : row.action === "skip"
      ? (row.reason ?? row.detail)
      : row.detail;

/** Pad every id to the widest, so the three columns line up. */
const widthOf = (rows: readonly PlanRow[], pick: (row: PlanRow) => string) =>
  Math.max(0, ...rows.map((row) => pick(row).length));

/** Group rows by band, in the plan's own band order. */
function byBand(plan: SetupPlan): [ScopeBand, PlanRow[]][] {
  const bands: ScopeBand[] = ["global", "project"];
  return bands
    .map((band): [ScopeBand, PlanRow[]] => [
      band,
      plan.rows.filter((row) => row.band === band),
    ])
    .filter(([, rows]) => rows.length > 0);
}

/**
 * Render the plan as the preview table.
 *
 * @param plan - The plan to render.
 * @param options - `lead` heads the block; `hint` is the trailing line (the
 *   non-interactive preview's "nothing was applied", or the dry-run's own).
 * @param style - Injected for tests; defaults to the shared TTY seam.
 * @returns The rendered block.
 */
export function renderPlanTable(
  plan: SetupPlan,
  options: { lead: string; hint?: string } = { lead: "Setup plan" },
  style: RenderStyle = defaultStyle(),
): string {
  const idWidth = widthOf(plan.rows, (row) => row.target);
  const actionWidth = widthOf(plan.rows, actionCell);
  const lines = [style.bold(header(plan, options.lead)), ""];
  const groups = byBand(plan);
  for (const [band, rows] of groups) {
    if (plan.scope === "both") lines.push(style.bold(BAND_LABELS[band]));
    for (const row of rows) {
      lines.push(
        `  ${row.target.padEnd(idWidth)}  ${actionCell(row).padEnd(actionWidth)}  ${style.dim(detailCell(row))}`,
      );
    }
  }
  if (options.hint) lines.push("", options.hint);
  return lines.join("\n");
}

/**
 * One progress line, emitted as a row's outcome lands. Same columns as the
 * recap, so a reader watching the run and a reader reading the recap afterwards
 * see the same sentence about the same row.
 *
 * @param row - The row, with its outcome filled in.
 * @param idWidth - The shared id column width.
 * @param style - Injected for tests.
 * @returns The line.
 */
export function renderProgressLine(
  row: PlanRow,
  idWidth: number,
  style: RenderStyle = defaultStyle(),
): string {
  const painted = withRed(style);
  const outcome = row.outcome;

  // No outcome at all: the row was offered and left unselected. It is neither a
  // success nor a skip-for-cause, and painting it green would claim work that
  // never happened, so it gets a neutral marker and says plainly what it is.
  if (outcome === undefined) {
    return `${painted.dim(NOT_RUN_GLYPH)} ${row.target.padEnd(idWidth)}  ${painted.dim(`${row.detail} — not selected`)}`;
  }

  const glyph = GLYPHS[outcome.status];
  const tinted =
    outcome.status === "failed"
      ? painted.red(glyph)
      : outcome.status === "skipped" || outcome.status === "kept"
        ? painted.yellow(glyph)
        : painted.green(glyph);
  const note = outcome.note;
  const body =
    outcome.status === "skipped"
      ? `skipped — ${row.reason ?? row.detail}`
      : note
        ? `${row.detail} — ${note}`
        : row.detail;
  return `${tinted} ${row.target.padEnd(idWidth)}  ${body}`;
}

/**
 * The recap: the plan replayed with outcomes.
 *
 * The headline counts SELECTED rows, never "steps that ran", so a target that
 * was selected and then skipped is visible in the denominator instead of
 * vanishing from a sentence that claims completeness.
 *
 * @param plan - The plan, with outcomes filled in.
 * @param lead - The headline's first word (`Setup` / `Removed`).
 * @param style - Injected for tests.
 * @returns The rendered recap.
 */
export function renderRecap(
  plan: SetupPlan,
  lead = "Setup",
  style: RenderStyle = defaultStyle(),
): string {
  const { configured, accountable } = planTally(plan);
  const idWidth = widthOf(plan.rows, (row) => row.target);
  const lines = [
    style.bold(
      `${lead}: ${configured} of ${accountable} targets configured — ${scopePhrase(plan.scope)}`,
    ),
  ];
  for (const [band, rows] of byBand(plan)) {
    if (plan.scope === "both") lines.push(style.bold(`  ${BAND_LABELS[band]}`));
    for (const row of rows) {
      lines.push(`  ${renderProgressLine(row, idWidth, style)}`);
      const remedy = row.outcome?.remedy;
      if (remedy) lines.push(`      ${style.dim(remedy)}`);
    }
  }
  lines.push("", style.dim(`verify anytime: ${BIN_NAME} doctor`));
  return lines.join("\n");
}

/** The condensed Markdown form — the same rows, one bullet each. */
export function renderPlanLlm(plan: SetupPlan, lead = "Setup"): string {
  const lines = [`## ${lead} — ${scopePhrase(plan.scope)}`, ""];
  for (const row of plan.rows) {
    const status = row.outcome?.status;
    // Before a run there is no outcome to report, so the row shows its ACTION
    // behind a neutral marker. Reusing the `noop` glyph here painted every row
    // of an unapplied plan — skips included — with a green check.
    const glyph = status === undefined ? NOT_RUN_GLYPH : GLYPHS[status];
    const state = status ?? row.action;
    lines.push(
      `- ${glyph} **${row.target}** (${row.band}): ${state} — ${detailCell(row)}`,
    );
    for (const child of row.children ?? []) {
      lines.push(`  - ${childCell(child)}`);
    }
    if (row.outcome?.remedy) lines.push(`  - _fix:_ ${row.outcome.remedy}`);
  }
  return lines.join("\n");
}
