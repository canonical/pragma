/**
 * The setup plan — ONE structure with four readers.
 *
 * `--dry-run` prints it, the wizard edits its `selected` flags, progress reports
 * one line per row as its outcome lands, and the recap is the same rows with
 * `outcome` filled. `--format json` emits `{ scope, roots, rows }` verbatim.
 * Doctor reads the same target table (see {@link ./targets.js}) so the two
 * surfaces cannot disagree about what they looked at.
 *
 * The shape is deliberately flat and JSON-ready: no class, no live handle, no
 * task. A row is a fact about what a run WOULD do (or, once `outcome` is set,
 * what it did), which is why the plan can be rendered before, during, and after
 * the run without any reader having to know which phase produced it.
 *
 * This module is pure data + pure derivations. It carries no import of the
 * operations, the harnesses runtime, or React — so the renderers, the doctor
 * checks, and the verb can all reach it without dragging anything heavy along.
 */

import { isAbsolute, relative, sep } from "node:path";
import type { ScopeBand, ScopeSelection } from "./types.js";

/** The five setup targets, in table (and therefore display) order. */
export const TARGET_IDS = [
  "config",
  "completions",
  "lsp",
  "mcp",
  "skills",
] as const;

/** One target id — the `setup <target>` argument AND the doctor row name. */
export type TargetId = (typeof TARGET_IDS)[number];

/**
 * What a run would do to one row. `none` is "already current" (a converged
 * re-run performs zero filesystem mutations); `skip` is "cannot or should not
 * act here", and always carries a {@link PlanRow.reason}.
 */
export type PlanAction =
  | "install"
  | "update"
  | "link"
  | "remove"
  | "none"
  | "skip";

/** How one row ended. `skipped` is NOT a failure — see {@link planExitFailed}. */
export type OutcomeStatus =
  | "done"
  | "noop"
  | "skipped"
  | "failed"
  | "removed"
  | "kept";

/** Per-file / per-link detail under a row (MCP files; skill link dirs). */
export interface PlanChildRow {
  /**
   * The stable identifier the wizard's per-file selection and `--format json`
   * key on — an absolute path for both MCP files and skill link dirs. Distinct
   * from {@link label}, which is display text and may be re-worded freely.
   */
  readonly key: string;
  /** Display text, e.g. `~/.claude.json — Claude Code`. */
  readonly label: string;
  readonly action: "add" | "update" | "unchanged" | "skip";
  /** REQUIRED when the action is `skip` — the named reason. */
  readonly reason?: string;
}

/** How one row ended, filled in after (or during) apply; absent in a pure plan. */
export interface PlanOutcome {
  readonly status: OutcomeStatus;
  /** `2 added, 1 updated`, or the failure line. */
  readonly note?: string;
  /**
   * An action that works on THIS machine NOW — probed, not hoped — or absent.
   * Never a generic cause, never a command for a binary this machine lacks,
   * never an ephemeral path.
   */
  readonly remedy?: string;
}

/** One row of the plan: one target in one band. */
export interface PlanRow {
  readonly target: TargetId;
  readonly band: ScopeBand;
  readonly action: PlanAction;
  /** Right-hand column: what and where, rendered root-relative. */
  readonly detail: string;
  /** REQUIRED when the action is `skip` — the named reason. */
  readonly reason?: string;
  readonly children?: readonly PlanChildRow[];
  /** The wizard edits this; `--yes` takes it as-is. Skips are never selectable. */
  readonly selected: boolean;
  readonly outcome?: PlanOutcome;
}

/** Built once per invocation from the target table's detections. */
export interface SetupPlan {
  readonly scope: ScopeSelection;
  /**
   * True when this plan was rendered INSTEAD of being applied — an explicit
   * `--dry-run`, or a non-interactive run that was not given `--yes`. The
   * renderer turns it into the trailing "nothing was applied" line; readers of
   * `--format json` get the same fact without parsing prose.
   */
  readonly preview?: boolean;
  /** Named once in the header; every row path renders relative to one of these. */
  readonly roots: { readonly global: string; readonly project: string };
  readonly rows: readonly PlanRow[];
}

/**
 * Whether a plan action would touch the filesystem. `none` and `skip` are the
 * two quiet outcomes: a converged re-run composes no effects at all, so mtimes
 * stay untouched and a second `--yes` writes nothing.
 */
export const isActionable = (action: PlanAction): boolean =>
  action === "install" ||
  action === "update" ||
  action === "link" ||
  action === "remove";

/**
 * Default selection for a freshly built row: actionable rows are pre-selected,
 * already-current rows are shown de-selected, and a skip is never selectable.
 */
export const defaultSelected = (action: PlanAction): boolean =>
  isActionable(action);

/** The rows a run acts on: selected, and not a skip. */
export const selectedRows = (plan: SetupPlan): readonly PlanRow[] =>
  plan.rows.filter((row) => row.selected && row.action !== "skip");

/**
 * THE exit rule (and the reason it is stated once, here): a run fails only when
 * a selected row was attempted and did not happen. Every selected row ending
 * `done`, `noop` or `skipped` exits 0 — including a headless box where nothing
 * is installable, because a skip is "nothing to do here, honestly named", the
 * same semantics doctor gives its skip glyph. Punishing a converged or benignly
 * empty state with a non-zero exit makes a dotfiles script fail on a machine
 * with an exotic shell, which teaches people to ignore the exit code.
 *
 * @param plan - The plan, with outcomes filled in.
 * @returns Whether any selected row ended `failed`.
 */
export const planExitFailed = (plan: SetupPlan): boolean =>
  plan.rows.some((row) => row.outcome?.status === "failed");

/**
 * `N of M targets` — the recap headline's counts.
 *
 * M is the rows this run took RESPONSIBILITY for: every row that reached an
 * outcome other than `skipped`. That is deliberately not "rows with the checkbox
 * ticked". An already-current row is offered de-selected because there is
 * nothing to do to it, so counting ticks reported a fully converged machine as
 * `0 of 0 configured` — a sentence that describes a machine where nothing
 * worked exactly as it describes one where everything already did.
 *
 * Skips stay out of both counts: a target that cannot act on this machine is
 * neither a success nor a shortfall, and it is already named on its own row.
 * A row the user deselected has no outcome at all and is likewise absent.
 *
 * @param plan - The plan, with outcomes filled in.
 * @returns The headline's numerator and denominator.
 */
export function planTally(plan: SetupPlan): {
  configured: number;
  accountable: number;
} {
  const accountable = plan.rows.filter(
    (row) => row.outcome !== undefined && row.outcome.status !== "skipped",
  );
  const configured = accountable.filter(
    (row) =>
      row.outcome?.status === "done" ||
      row.outcome?.status === "noop" ||
      row.outcome?.status === "removed" ||
      row.outcome?.status === "kept",
  );
  return { configured: configured.length, accountable: accountable.length };
}

/**
 * Render one absolute path relative to whichever root contains it — the header
 * names both roots once, so a row never repeats a 120-character prefix. The
 * global root prints as `~`; the project root prints as `.`. A path under
 * neither root stays absolute, because shortening it would be a guess — and a
 * sibling directory whose name merely EXTENDS a root's is under neither.
 *
 * The project root is tried FIRST: a project checked out inside the home
 * directory sits under both, and the more specific root is the informative one.
 *
 * @param path - An absolute path.
 * @param roots - The plan's two named roots.
 * @returns The root-relative rendering.
 */
export function shortenPath(path: string, roots: SetupPlan["roots"]): string {
  for (const [root, marker] of [
    [roots.project, "."],
    [roots.global, "~"],
  ] as const) {
    if (!root) continue;
    if (path === root) return marker;
    // Containment is a question about path SEGMENTS, and the separator is the
    // host's. Testing `startsWith(root + "/")` answered no for every Windows
    // path `node:path` produces, so the plan printed absolute paths where it
    // had just named the root they sit under — and it answered YES for a
    // sibling whose name merely extends the root's.
    const rel = relative(root, path);
    if (
      rel.length === 0 ||
      rel === ".." ||
      rel.startsWith(`..${sep}`) ||
      isAbsolute(rel)
    ) {
      continue;
    }
    return `${marker}${sep}${rel}`;
  }
  return path;
}

/** Replace a row's outcome, leaving every other field untouched. */
export const withOutcome = (row: PlanRow, outcome: PlanOutcome): PlanRow => ({
  ...row,
  outcome,
});

/** Replace a plan's rows (the wizard's edit, and the apply phase's fill-in). */
export const withRows = (
  plan: SetupPlan,
  rows: readonly PlanRow[],
): SetupPlan => ({ ...plan, rows });
