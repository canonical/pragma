/**
 * Turn a conformance fixture's ANSWER SET into the CLI argument vector that
 * expresses it — the projection's flag grammar, driven backwards. The
 * cross-CLI matrix derives each producer's argv from the SAME answers with
 * this one function, so the two binaries are always handed identical inputs
 * (modulo the mount prefix) and an argv hand-drift cannot fake parity.
 *
 * Rules (the inverse of `extractAnswers` + `buildOptionInfo`):
 *  - an answer equal to its prompt's default is OMITTED (it could never be
 *    expressed explicitly for a confirm anyway — the equality trick);
 *  - a confirm answers `--<kebab>` (true) or `--no-<kebab>` (false);
 *  - the positional prompt's answer is emitted positionally, first;
 *  - text/select answers become `--<kebab>=<value>`;
 *  - a multiselect becomes `--<kebab>=<comma,list>`.
 */

import toKebabCase from "../../projection/kebab.js";
import type { PromptLike } from "../../projection/types.js";

/** Whether an answer equals the prompt's declared default. */
function sameAsDefault(value: unknown, defaultValue: unknown): boolean {
  if (Object.is(value, defaultValue)) return true;
  if (Array.isArray(value) && Array.isArray(defaultValue)) {
    return (
      value.length === defaultValue.length &&
      value.every((item, index) => Object.is(item, defaultValue[index]))
    );
  }
  return false;
}

/**
 * Express an answer set as CLI arguments (positional first, flags in prompt
 * order).
 *
 * @param prompts - The command's prompts (live or projected).
 * @param answers - The answers to express.
 * @returns The argument vector.
 */
export function flagizeAnswers(
  prompts: readonly PromptLike[],
  answers: Readonly<Record<string, unknown>>,
): string[] {
  const positionals: string[] = [];
  const flags: string[] = [];
  for (const prompt of prompts) {
    if (!(prompt.name in answers)) continue;
    const value = answers[prompt.name];
    if (sameAsDefault(value, prompt.default)) continue;
    const kebab = toKebabCase(prompt.name);
    if (prompt.type === "confirm") {
      flags.push(value === true ? `--${kebab}` : `--no-${kebab}`);
      continue;
    }
    if (prompt.positional === true) {
      positionals.push(String(value));
      continue;
    }
    if (prompt.type === "multiselect" && Array.isArray(value)) {
      flags.push(`--${kebab}=${value.join(",")}`);
      continue;
    }
    flags.push(`--${kebab}=${String(value)}`);
  }
  return [...positionals, ...flags];
}
