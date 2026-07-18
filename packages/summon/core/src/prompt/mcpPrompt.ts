/**
 * The MCP prompt strategy: resolve every answer from the tool arguments or the
 * prompt's default, and fail structurally otherwise — never block on stdin.
 *
 * An MCP tool call carries all inputs up front as arguments; there is no
 * interactive channel. This handler resolves each `Prompt` effect from the
 * provided `params` (defensively — {@link collectAnswers} already skips provided
 * answers), then the prompt's declared default, and otherwise rejects with a
 * structured `MISSING_REQUIRED_ANSWER` task error. It is synchronous-resolving
 * by construction, so a mutating tool can never hang waiting for input.
 */

import { missingRequiredError } from "./autoPrompt.js";
import type { PromptEffect, PromptHandler } from "./types.js";

/**
 * A prompt handler that resolves answers from MCP tool args or defaults.
 *
 * @param params - The tool arguments (already coerced to the answer shape).
 * @returns The MCP {@link PromptHandler} — params-or-default-or-error, never a hang.
 */
export default function mcpPrompt(
  params: Readonly<Record<string, unknown>> = {},
): PromptHandler {
  return (effect: PromptEffect) => {
    const q = effect.question;
    if (q.name in params) return Promise.resolve(params[q.name]);
    if (q.default !== undefined) return Promise.resolve(q.default);
    return Promise.reject(missingRequiredError(effect, "argument"));
  };
}
