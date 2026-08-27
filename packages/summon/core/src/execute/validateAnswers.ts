/**
 * Validate resolved generator answers against each prompt's own constraints.
 *
 * `select` answers must be one of the declared choices, and any `validate`
 * function must accept the value. Returns the first failure message, or `null`
 * when every applicable answer is valid.
 *
 * Reuses the exact `validate` the interactive prompt already runs, so a
 * flag-driven or MCP-arg run (non-interactive) rejects the same bad input a
 * wizard would — e.g. an empty component path or an unknown package type. This
 * is the moved v1 `executeGenerator.findInvalidAnswer`, now run inside
 * {@link execute} so both interactive and non-interactive paths share it.
 */

import formatFlagName from "../format/formatFlagName.js";
import type PromptDefinition from "../types/PromptDefinition.js";

/**
 * Find the first answer that violates its prompt's constraints.
 *
 * @param prompts - The generator's prompt definitions.
 * @param answers - The resolved answers to validate.
 * @returns A human-readable message for the first invalid answer, or `null`.
 */
export default function validateAnswers(
  prompts: readonly PromptDefinition[],
  answers: Record<string, unknown>,
): string | null {
  for (const prompt of prompts) {
    if (prompt.when && prompt.when(answers) !== true) continue;
    if (!Object.hasOwn(answers, prompt.name)) continue;
    const value = answers[prompt.name];

    if (
      prompt.type === "select" &&
      prompt.choices &&
      prompt.choices.length > 0 &&
      !prompt.choices.some((choice) => choice.value === value)
    ) {
      const valid = prompt.choices.map((choice) => choice.value).join(", ");
      return `Invalid --${formatFlagName(prompt.name)} "${String(value)}". Valid values: ${valid}.`;
    }

    if (
      prompt.type === "multiselect" &&
      prompt.choices &&
      prompt.choices.length > 0 &&
      Array.isArray(value)
    ) {
      const allowed = new Set<unknown>(
        prompt.choices.map((choice) => choice.value),
      );
      // Strict membership with an index, not a find() sentinel: `[1]` must
      // not pass for a declared "1", and `[undefined]` must still be caught.
      const badIndex = value.findIndex(
        (entry) => typeof entry !== "string" || !allowed.has(entry),
      );
      if (badIndex !== -1) {
        const valid = prompt.choices.map((choice) => choice.value).join(", ");
        return `Invalid --${formatFlagName(prompt.name)} "${String(value[badIndex])}". Valid values: ${valid}.`;
      }
    }

    if (prompt.validate) {
      const verdict = prompt.validate(value);
      if (verdict !== true) {
        const detail = typeof verdict === "string" ? verdict : "invalid value";
        return `Invalid --${formatFlagName(prompt.name)}: ${detail}`;
      }
    }
  }
  return null;
}
