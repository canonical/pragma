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

import type PromptDefinition from "../types/PromptDefinition.js";

/** Convert a camelCase prompt name to its kebab-case CLI flag form. */
const toKebab = (name: string): string =>
  name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

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
    if (!(prompt.name in answers)) continue;
    const value = answers[prompt.name];

    if (
      prompt.type === "select" &&
      prompt.choices &&
      prompt.choices.length > 0 &&
      !prompt.choices.some((choice) => choice.value === value)
    ) {
      const valid = prompt.choices.map((choice) => choice.value).join(", ");
      return `Invalid --${toKebab(prompt.name)} "${String(value)}". Valid values: ${valid}.`;
    }

    if (prompt.validate) {
      const verdict = prompt.validate(value);
      if (verdict !== true) {
        const detail = typeof verdict === "string" ? verdict : "invalid value";
        return `Invalid --${toKebab(prompt.name)}: ${detail}`;
      }
    }
  }
  return null;
}
