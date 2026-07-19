import type { Effect } from "@canonical/task";

/**
 * Resolve a `Prompt` effect to its default without user interaction — the
 * defaults-only handler the summon Ink progress view drives, and the base the
 * seam's {@link autoPrompt} strategy layers required-missing detection on.
 *
 * Each prompt type yields the value a non-interactive run should assume: a
 * confirm's default (or `true`), a select's default (or its first choice), an
 * empty multiselect, or a text default (or `""`).
 *
 * @param effect - A `Prompt` effect to resolve.
 * @returns The default answer for the prompt's type.
 */
export default function answerPromptWithDefaults(
  effect: Effect & { _tag: "Prompt" },
): Promise<unknown> {
  const question = effect.question;
  switch (question.type) {
    case "confirm":
      return Promise.resolve(question.default ?? true);
    case "select":
      return Promise.resolve(question.default ?? question.choices[0]?.value);
    case "multiselect":
      return Promise.resolve(question.default ?? []);
    default:
      return Promise.resolve(question.default ?? "");
  }
}
