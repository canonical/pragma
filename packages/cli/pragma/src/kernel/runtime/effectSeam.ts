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
