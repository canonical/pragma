/**
 * Extract the EXPLICITLY provided answers from parsed Commander options —
 * moved verbatim from the summon bin's registration layer. Explicit-only is
 * the invariant: defaults never enter the result (Commander was registered
 * without them — see `buildOptionInfo`), so downstream decisions can tell a
 * typed flag from an untouched one.
 *
 * The one unavoidable ambiguity: Commander reports a default-`true` confirm's
 * `--no-<kebab>` as `true` when the flag was NOT passed. Equality-vs-default
 * filters that out — a confirm value equal to its declared default is treated
 * as unprovided. (Typing the flag that restates the default is therefore
 * indistinguishable from omitting it; every consumer inherits that fact.)
 */

import type { PromptLike } from "./types.js";

/**
 * Extract answers from Commander options based on prompts.
 *
 * @param options - Commander's parsed option values.
 * @param prompts - The command's prompts (live or projected).
 * @returns Only the explicitly provided answers, keyed by prompt name.
 */
export default function extractAnswers(
  options: Record<string, unknown>,
  prompts: readonly PromptLike[],
): Record<string, unknown> {
  const answers: Record<string, unknown> = {};

  for (const prompt of prompts) {
    // Own-property read: Commander's options object is an ordinary object,
    // so a prompt named like an inherited member (`toString`) would
    // otherwise read the prototype's function and count as provided.
    const value = Object.hasOwn(options, prompt.name)
      ? options[prompt.name]
      : undefined;

    if (value !== undefined) {
      switch (prompt.type) {
        case "confirm": {
          const boolValue = Boolean(value);
          if (boolValue !== prompt.default) {
            answers[prompt.name] = boolValue;
          }
          break;
        }
        case "multiselect":
          answers[prompt.name] =
            typeof value === "string"
              ? value.split(",").map((v) => v.trim())
              : value;
          break;
        default:
          answers[prompt.name] = value;
      }
    }
  }

  return answers;
}
