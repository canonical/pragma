/**
 * Build the plan: run the target table's detections, then project them into
 * {@link SetupPlan} rows.
 *
 * This is the ONE place a plan comes from. The dry-run, the wizard, the apply
 * phase, the recap and `--format json` all read what this produces, so a row
 * that is missing here is missing everywhere — which is the point: the run-all
 * used to build its choices only from DETECTABLE steps, so a target that could
 * not be offered vanished from the recap and "Setup complete" papered over it.
 * Every selected target is a visible row here, including the ones that skip.
 */

import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import {
  defaultSelected,
  type PlanRow,
  type SetupPlan,
  type TargetId,
} from "./plan.js";
import {
  type AnyTarget,
  supportsBand,
  TARGETS,
  type TargetDraft,
} from "./targets.js";
import type { ScopeBand, ScopeSelection } from "./types.js";

/** One detection, kept beside the row that produced it (and can read it back). */
export interface DetectedRow {
  readonly target: AnyTarget;
  readonly band: ScopeBand;
  readonly detection: never;
  /**
   * Why this row's detection did not settle, when it threw. `detection` is then
   * meaningless and no reader may touch it — {@link detectionFailure} is the
   * only question to ask of such a row.
   */
  readonly failure?: string;
}

/** The failure a row's detection ended in, or `undefined` when it settled. */
export const detectionFailure = (row: DetectedRow): string | undefined =>
  row.failure;

/** A plan plus the detections behind it — what the apply phase needs. */
export interface DetectedPlan {
  readonly plan: SetupPlan;
  readonly detected: readonly DetectedRow[];
}

/** The bands a `--scope` selection runs, global before project. */
export const bandsForScope = (scope: ScopeSelection): readonly ScopeBand[] =>
  scope === "both" ? ["global", "project"] : [scope];

/**
 * The two named roots. The global root is the user's home directory (rendered
 * `~`), the project root is the directory the invocation resolves against.
 *
 * @param rt - The per-invocation runtime.
 * @returns The roots every row path renders relative to.
 * @note Impure — reads the platform environment.
 */
export async function resolveRoots(
  rt: PragmaRuntime,
): Promise<SetupPlan["roots"]> {
  const { readPlatformEnv, userHome } = await import("@canonical/harnesses");
  return { global: userHome(readPlatformEnv()), project: rt.cwd };
}

/** The cause a rejected detection carries, as one line of copy. */
const messageOf = (reason: unknown): string =>
  reason instanceof Error ? reason.message : String(reason);

/**
 * Detect every requested target in every band the scope runs.
 *
 * Detections are started together and SETTLED INDEPENDENTLY: they are
 * independent reads, and a run-all that probed five targets serially paid for
 * it on every invocation.
 *
 * Independence is the whole premise, so one detection that throws — an
 * unreadable config, a permission-denied directory — takes only its own row
 * down. Awaiting them as one `Promise.all` meant the first rejection prevented
 * a run from being built at all: none of the other targets ran, and doctor
 * rendered no banded rows whatsoever. The failed row carries its cause and is
 * reported as a row, which is the same shape a failed COMPOSE already has.
 *
 * @param rt - The per-invocation runtime.
 * @param ids - The targets to plan (all five for the run-all).
 * @param scope - The resolved band selection.
 * @returns One entry per (target, band) the scope actually runs.
 * @note Impure — every target's `detect` reads the real filesystem.
 */
export async function detectTargets(
  rt: PragmaRuntime,
  ids: readonly TargetId[],
  scope: ScopeSelection,
): Promise<DetectedRow[]> {
  const wanted = TARGETS.filter((target) => ids.includes(target.id));
  const pairs = bandsForScope(scope).flatMap((band) =>
    wanted
      .filter((target) => supportsBand(target, band))
      .map((target) => ({
        target,
        band,
      })),
  );
  const settled = await Promise.allSettled(
    pairs.map(({ target, band }) => target.detect(rt, band)),
  );
  return pairs.map(({ target, band }, index) => {
    const outcome = settled[index] as PromiseSettledResult<unknown>;
    if (outcome.status === "fulfilled") {
      return { target, band, detection: outcome.value as never };
    }
    return {
      target,
      band,
      detection: undefined as never,
      failure: messageOf(outcome.reason),
    };
  });
}

/**
 * The dim row a target gets when the SELECTED band cannot hold it — `setup
 * --local` still shows `completions`, saying why it is not in this run. A band
 * merely filters the run-all: the user asked for a band, not for that target, so
 * nothing errors, but nothing is silently absent either. (Asking for the
 * impossible band on the SUB-VERB is a different thing entirely — a typed
 * contradiction, and a usage error.)
 */
const outOfBandRow = (target: AnyTarget, band: ScopeBand): PlanRow => ({
  target: target.id,
  band,
  action: "skip",
  detail: "not in this band",
  reason:
    band === "project"
      ? "user-level only — it has no project band"
      : "project-level only — it has no global band",
  selected: false,
});

/**
 * The row a target gets when its own detection threw. It is a `skip` in the
 * PLAN — nothing can be composed from a detection that does not exist — but it
 * is not a quiet one: the reason is the cause, and the apply phase turns it
 * into a `failed` outcome, so the run exits non-zero naming this target rather
 * than reporting a clean sweep over the targets that did settle.
 */
const failedDetectionRow = (
  target: AnyTarget,
  band: ScopeBand,
  failure: string,
): PlanRow => ({
  target: target.id,
  band,
  action: "skip",
  detail: "detection did not complete",
  reason: failure,
  selected: false,
});

/**
 * The draft a detected row produces — the forward plan, or the removal plan.
 * Re-derivable from the detection at any time, which is why the plan row itself
 * stores no remedy: a remedy belongs to an OUTCOME, and the apply phase reads it
 * back from here when it fills one in.
 *
 * @param hit - The detected row.
 * @param roots - The two named roots.
 * @param removal - Whether this invocation removes rather than installs.
 * @returns The target's draft.
 */
export function draftFor(
  hit: DetectedRow,
  roots: SetupPlan["roots"],
  removal: boolean,
): TargetDraft {
  return removal
    ? hit.target.removalPlan(hit.detection, hit.band, roots)
    : hit.target.plan(hit.detection, hit.band, roots);
}

/**
 * Project detections into plan rows.
 *
 * @param scope - The resolved band selection (named in the header).
 * @param roots - The two named roots every path renders relative to.
 * @param detected - The detections, in table order per band.
 * @param ids - The targets that were REQUESTED, so an out-of-band one still
 *   gets a visible row.
 * @param removal - Build the removal plan (`--undo`) instead of the forward one.
 * @returns The plan.
 */
export function buildPlan(
  scope: ScopeSelection,
  roots: SetupPlan["roots"],
  detected: readonly DetectedRow[],
  ids: readonly TargetId[],
  removal = false,
): SetupPlan {
  const rows: PlanRow[] = [];
  for (const band of bandsForScope(scope)) {
    for (const target of TARGETS) {
      if (!ids.includes(target.id)) continue;
      const hit = detected.find(
        (d) => d.target.id === target.id && d.band === band,
      );
      if (hit === undefined) {
        // Only worth a line when the target has no row in ANY selected band —
        // under `--scope both` a global-only target already appears above.
        const elsewhere = detected.some((d) => d.target.id === target.id);
        if (!elsewhere) rows.push(outOfBandRow(target, band));
        continue;
      }
      const failure = detectionFailure(hit);
      if (failure !== undefined) {
        rows.push(failedDetectionRow(target, band, failure));
        continue;
      }
      const draft = draftFor(hit, roots, removal);
      rows.push({
        target: target.id,
        band,
        action: draft.action,
        detail: draft.detail,
        ...(draft.reason === undefined ? {} : { reason: draft.reason }),
        ...(draft.children === undefined ? {} : { children: draft.children }),
        selected: defaultSelected(draft.action),
      });
    }
  }
  return { scope, roots, rows };
}
