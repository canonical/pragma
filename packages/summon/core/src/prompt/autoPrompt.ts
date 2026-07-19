/**
 * The non-interactive prompt strategy: flags/args + defaults, with a structured
 * failure for a missing required answer.
 *
 * This is the evolved `answerPromptWithDefaults` the seam calls for `--yes`, a
 * non-interactive terminal, or CI. Because {@link collectAnswers} only emits a
 * `Prompt` effect for a prompt NOT already provided, this handler is reached
 * only for unprovided answers: it returns the prompt's declared default, or —
 * when a prompt has no default (a required, unprovided answer) — rejects with a
 * structured `MISSING_REQUIRED_ANSWER` task error rather than silently
 * substituting a bare `""` / first-choice value (the old exit-3 safety).
 */

import { TaskExecutionError } from "@canonical/task";
import type { PromptEffect, PromptHandler } from "./types.js";

/** The task-error code raised when a required answer is neither provided nor defaulted. */
export const MISSING_REQUIRED_ANSWER = "MISSING_REQUIRED_ANSWER";

/** Convert a camelCase answer key to its kebab-case CLI flag form. */
const toKebab = (name: string): string =>
  name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/**
 * Build the structured error for a required, unprovided answer.
 *
 * @param effect - The `Prompt` effect whose answer is missing.
 * @param noun - How to name the missing input in the message ("flag" / "argument").
 * @returns A {@link TaskExecutionError} the interpreter routes as a task failure.
 */
export function missingRequiredError(
  effect: PromptEffect,
  noun: "flag" | "argument" = "flag",
): TaskExecutionError {
  const { name, message } = effect.question;
  return new TaskExecutionError({
    code: MISSING_REQUIRED_ANSWER,
    message: `Missing required ${noun} --${toKebab(name)} (${message}). Provide it non-interactively, or run interactively to be prompted.`,
    context: { answer: name },
  });
}

/**
 * A prompt handler that resolves each unprovided prompt to its default, or
 * fails with {@link missingRequiredError} when no default exists.
 *
 * @param _params - The already-provided answers (accepted for symmetry with the
 *   other strategies; {@link collectAnswers} has already filtered these out, so
 *   this handler only ever sees unprovided prompts).
 * @returns The non-interactive {@link PromptHandler}.
 */
export default function autoPrompt(
  _params: Readonly<Record<string, unknown>> = {},
): PromptHandler {
  return (effect) => {
    const q = effect.question;
    if (q.default !== undefined) return Promise.resolve(q.default);
    return Promise.reject(missingRequiredError(effect, "flag"));
  };
}
