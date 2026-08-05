/**
 * Compose a mutating verb's two effect-seam halves into the ONE callback the
 * node interpreter accepts.
 *
 * `RunTaskOptions` has a single `onEffectStart`, but a verb declares two things
 * on it: how an effect's CONTENT is shaped (`shapeEffect` — `create`'s
 * generated-by stamp, which rewrites `WriteFile.content` in place) and what the
 * UI does about it (`onEffectStart` — the Ink progress render). A plan wants the
 * first and must not have the second, so the two are declared apart and joined
 * here, in one writing, for the three call sites that drive a Task: the CLI
 * dispatcher, the MCP verb projector, and the dry-vs-real harness.
 *
 * Shaping runs FIRST, so the progress render — and the harness's recorder —
 * observe the effect the interpreter is about to perform, not the one the
 * generator constructed.
 *
 * The PLAN branch's half of the same join lives here too ({@link
 * planEffectSeam}), and it is here because it was three writings and a hole.
 * Each of the three drivers spelled `{ cwd: …, onEffectStart: exec?.shapeEffect }`
 * inline, INCLUDING the dry-vs-real harness — which meant the harness proved
 * `planTask` applies a shaping callback when one is passed, never that either
 * shipped call site passes one. Measured on this branch: deleting
 * `onEffectStart` from the CLI dispatcher AND the MCP projector left the whole
 * package green (1121 passed, 0 failed) while `create component --dry-run`
 * planned `Widget.tsx (432) / types.ts (199) / index.ts (82) / styles.css (39)`
 * against a real run writing `490 / 257 / 140 / 100` — every file short by
 * exactly its generated-by stamp, the exact defect PR7 exists to close. The
 * stamp is NOT one number, which is why `styles.css` is the odd row here (39 →
 * 100, a delta of 61): `applyStamp` picks the comment syntax per extension, so
 * the six files taking the line-comment form carry 58 bytes and the CSS
 * block-comment form carries 61. Measured by generating the component for real
 * and splitting each file at its stamp: the 53-character message plus `// ` and
 * a blank line is 58; wrapped in the CSS block delimiters it is 61. One writing here, plus
 * the end-to-end byte assertion in `testing/behavioral/dryRunParity.test.ts`,
 * is what makes that deletion fail rather than pass.
 */

import type { Effect } from "@canonical/task";
import type { RunnerOptions } from "./types.js";

/**
 * The `onEffectStart` a real run installs: shaping, then the verb's own UI.
 *
 * @param exec - The verb's runner options (`rt.exec`).
 * @returns The composed callback, or `undefined` when the verb declared neither
 * half — so the interpreter installs no callback at all rather than a no-op.
 */
export function runEffectSeam(
  exec: RunnerOptions,
): ((effect: Effect) => void) | undefined {
  const { shapeEffect, onEffectStart } = exec;
  if (!shapeEffect) return onEffectStart;
  if (!onEffectStart) return shapeEffect;
  return (effect) => {
    shapeEffect(effect);
    onEffectStart(effect);
  };
}

/** The `planTask` options a plan branch derives from the verb's runner options. */
export interface PlanSeam {
  /** Base directory the plan's real reads and simulated writes resolve against. */
  readonly cwd: string | undefined;
  /** The CONTENT-shaping half only — never the verb's UI half. */
  readonly onEffectStart: ((effect: Effect) => void) | undefined;
}

/**
 * The `onEffectStart`/`cwd` a PLAN installs: shaping, and nothing else.
 *
 * `planTask` has one `onEffectStart` slot and the verb has two halves, so the
 * plan takes the shaping one — `create`'s generated-by stamp rewrites
 * `WriteFile.content` on it, and a plan without it advertises byte counts the
 * run would not write. The UI half is dropped rather than passed and ignored: a
 * preview mounts no progress render because no run is happening.
 *
 * `cwd` defaults to the verb's own — a plan that reads for real MUST resolve
 * relative paths against the same base its run does. The override exists for
 * ONE caller: the MCP projector resolves against the per-call SEC-2 jail root it
 * validated, which is the value it threads as `rt.cwd`. Passing it explicitly is
 * what keeps that difference a decision rather than an accident.
 *
 * @param exec - The verb's runner options (`rt.exec`), if it declared any.
 * @param cwd - Override for the base directory; defaults to `exec.cwd`.
 * @returns The two `planTask` options, ready to spread.
 */
export function planEffectSeam(
  exec: RunnerOptions | undefined,
  cwd: string | undefined = exec?.cwd,
): PlanSeam {
  return { cwd, onEffectStart: exec?.shapeEffect };
}
