/**
 * Answer-set arithmetic over a command's prompts: apply defaults, decide
 * completeness, and derive the wizard's asking list. `applyDefaults` and
 * `hasAllRequiredAnswers` are moved verbatim from the summon bin;
 * `explicitAnswersComplete` and `pendingPrompts` are the two derived facts the
 * shared interaction decision and the wizards stand on.
 *
 * `pendingPrompts` is the wizard-script parity anchor: BOTH products' wizards
 * ask exactly this list (declared order, explicitly-answered prompts skipped,
 * conditional prompts included — their `when` is evaluated live by the wizard).
 */

import type { PromptLike } from "./types.js";

/** Whether a prompt is conditional (live `when`, or the projected marker). */
function isConditional(prompt: PromptLike): boolean {
  return prompt.when !== undefined || prompt.conditional === true;
}

/**
 * Check if all required prompts have answers.
 *
 * A prompt is required when it is unconditional and has no default; the check
 * passes when every such prompt is present in `answers`.
 *
 * @param prompts - The command's prompts (live or projected).
 * @param answers - The answer set to check (typically defaults already applied).
 * @returns True when no required prompt is missing.
 */
export function hasAllRequiredAnswers(
  prompts: readonly PromptLike[],
  answers: Record<string, unknown>,
): boolean {
  for (const prompt of prompts) {
    if (isConditional(prompt)) continue;
    if (!(prompt.name in answers) && prompt.default === undefined) {
      return false;
    }
  }
  return true;
}

/**
 * Apply defaults for prompts that don't have answers.
 *
 * @param prompts - The command's prompts (live or projected).
 * @param answers - The provided answers (never mutated).
 * @returns A new answer set with declared defaults filled in.
 */
export function applyDefaults(
  prompts: readonly PromptLike[],
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...answers };
  for (const prompt of prompts) {
    if (!(prompt.name in result) && prompt.default !== undefined) {
      result[prompt.name] = prompt.default;
    }
  }
  return result;
}

/**
 * Whether the EXPLICIT answers alone fully determine a run: every
 * unconditional prompt is explicitly answered (defaults do not count).
 * Conditional prompts are skipped — whether they even apply is a live-wizard
 * question, and every input they could depend on is already pinned.
 *
 * @param prompts - The command's prompts (live or projected).
 * @param explicit - The explicitly provided answers (no defaults).
 * @returns True when nothing would need to be asked or defaulted.
 */
export function explicitAnswersComplete(
  prompts: readonly PromptLike[],
  explicit: Readonly<Record<string, unknown>>,
): boolean {
  for (const prompt of prompts) {
    if (isConditional(prompt)) continue;
    if (!(prompt.name in explicit)) return false;
  }
  return true;
}

/**
 * The prompts a wizard must still ask, in declared order: every prompt not
 * explicitly answered. Conditional prompts are INCLUDED — the live wizard
 * evaluates their `when` against the answers collected so far and skips the
 * inapplicable ones itself.
 *
 * @param prompts - The command's prompts (live or projected).
 * @param explicit - The explicitly provided answers (no defaults).
 * @returns The asking list, a subsequence of `prompts`.
 */
export function pendingPrompts<P extends PromptLike>(
  prompts: readonly P[],
  explicit: Readonly<Record<string, unknown>>,
): P[] {
  return prompts.filter((prompt) => !(prompt.name in explicit));
}
