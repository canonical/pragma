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
 *  - a confirm answers with `buildOptionInfo`'s PRIMARY registered long
 *    form — `--<kebab>` for `true` (registered exactly when the default is
 *    not `true`; a default-`true` confirm answered `true` was omitted
 *    above), `--no-<kebab>` for `false` (registered ONLY for a default-
 *    `true` confirm). PRECONDITION: a confirm answered `false` must
 *    declare `default: true` — a default-less (or default-`false`,
 *    non-omitted) confirm has NO registered spelling for `false`, and this
 *    helper THROWS naming the prompt rather than hand the matrix an argv
 *    both binaries reject as an unknown option;
 *  - the positional prompt's answer is emitted positionally, first;
 *  - text/select answers become `--<kebab>=<value>`;
 *  - a multiselect becomes `--<kebab>=<comma,list>`.
 */

import buildOptionInfo from "../../projection/buildOptionInfo.js";
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
      // The registered form, from the single flag-shape authority — never a
      // kebab-cased guess (the round-14 F3 class: a spelling no host
      // registers hands the matrix an argv both binaries reject).
      const primary = buildOptionInfo(prompt).flags.split(" ")[0] as string;
      if (value === true) {
        // `true` differs from the default here, so the default is not
        // `true` and the registered form IS the positive `--<kebab>`.
        flags.push(primary);
        continue;
      }
      if (primary.startsWith("--no-")) {
        flags.push(primary);
        continue;
      }
      // `false` on a confirm whose registered form is the positive flag
      // (no declared `default: true`): no spelling exists — fail loudly.
      throw new Error(
        `flagizeAnswers: confirm "${prompt.name}" answered false has no ` +
          `registered spelling (buildOptionInfo registers only "${primary}"` +
          ") — declare `default: true` on the prompt or drop the answer",
      );
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
