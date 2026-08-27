/**
 * Formatters for `pragma setup` and its sub-verbs — one shared formatter over
 * the {@link SetupPlan} (plain, llm, json).
 *
 * The plan REPLACED a tagged result union with one member per sub-verb, each
 * rendering its own sentence in its own vocabulary. That union could not
 * describe a run that touched several targets in two bands, so the run-all
 * reported a list of step names and nothing about what any of them did. One
 * structure with one renderer is what makes the preview, the progress lines and
 * the recap agree by construction rather than by review.
 */

import type { Formatters } from "../../kernel/spec/index.js";
import type { SetupPlan } from "./plan.js";
import { renderPlanLlm, renderPlanTable, renderRecap } from "./plan.render.js";

/** The trailing line a non-applied plan carries. */
export const PREVIEW_HINT =
  "Nothing was applied. Run again with --yes to apply.";

/** The trailing line an explicit dry run carries. */
export const DRY_RUN_HINT = "Dry run — nothing applied.";

/**
 * Whether any row carries an outcome, i.e. whether a run actually happened.
 *
 * Selection is deliberately NOT part of this test. An all-current re-run selects
 * nothing — every row is already converged — and gating on `selected` made that
 * run render as an unapplied PLAN, so the one command that had just confirmed
 * the machine was fully set up reported itself as a preview.
 */
const wasApplied = (plan: SetupPlan): boolean =>
  plan.rows.some((row) => row.outcome !== undefined);

/**
 * The dry-run render. Reached ONLY through the verb's `formatPlan` seam, which
 * the kernel calls on the `--dry-run` branch — so it can name that path
 * outright. The identical body under {@link setupFormatters} serves the OTHER
 * preview, the non-interactive run that was given no consent, whose useful last
 * line is how to grant it.
 *
 * @param plan - The plan to render.
 * @returns The plan table, ended with the dry-run's own line.
 */
export const renderDryRun = (plan: SetupPlan): string =>
  renderPlanTable(plan, { lead: "Setup plan", hint: DRY_RUN_HINT });

export const setupFormatters: Formatters<SetupPlan> = {
  plain(data) {
    if (data.preview === true) {
      return renderPlanTable(data, { lead: "Setup plan", hint: PREVIEW_HINT });
    }
    if (!wasApplied(data)) {
      return renderPlanTable(data, { lead: "Setup plan" });
    }
    return renderRecap(data);
  },
  llm(data) {
    return renderPlanLlm(data, data.preview === true ? "Setup plan" : "Setup");
  },
  json(data) {
    return JSON.stringify(data);
  },
};
