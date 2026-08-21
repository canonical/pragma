/**
 * The summon host's mode resolution — `decideInteraction` over the five
 * inputs, with the TTY fact INJECTED so the resolution is testable with
 * `tty: true` (no suite can hand a subprocess a real TTY). The action calls
 * {@link resolveSummonMode} with {@link summonIsTTY}; the tests drive it with
 * a literal, pinning the §L rows that only exist on a TTY (dry-run/undo stay
 * batch, partial flags become a wizard).
 *
 * Deliberately UI-free (projection-only imports), so the seam itself never
 * pulls Ink into a test that only asserts the decision.
 */

import {
  decideInteraction,
  explicitAnswersComplete,
  type InteractionMode,
  type PromptLike,
} from "@canonical/summon-core/projection";

/**
 * Summon's TTY fact (parity-contract §3): stdin AND stdout are TTYs — the
 * wizard renders to stdout, so a piped stdout must be non-interactive.
 *
 * @returns True when both streams are TTYs.
 */
export function summonIsTTY(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

/**
 * Resolve the interaction mode for one generator invocation.
 *
 * @param prompts - The generator's prompts.
 * @param options - The parsed options AFTER the llm/json expansions.
 * @param explicit - The explicitly provided answers (flags + positional).
 * @param tty - The host TTY fact (the action passes {@link summonIsTTY}).
 * @returns The mode the action routes on.
 */
export function resolveSummonMode(
  prompts: readonly PromptLike[],
  options: Record<string, unknown>,
  explicit: Record<string, unknown>,
  tty: boolean,
): InteractionMode {
  return decideInteraction({
    dryRun: options.dryRun === true,
    undo: options.undo === true,
    yes: options.yes === true,
    isTTY: tty,
    explicitComplete: explicitAnswersComplete(prompts, explicit),
  }).mode;
}
