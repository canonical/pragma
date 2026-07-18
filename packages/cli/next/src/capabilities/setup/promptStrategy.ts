/**
 * The interactive seam for setup — binds to the folded-pr5
 * `runtime.interaction` / `runtime.exec` seam, exactly as `create` does.
 *
 * Setup's prompts are plain task `ConfirmPrompt`s (not summon wizards), so the
 * handler is small and local: an attended TTY without `--yes` gets a readline
 * yes/no session; everything else (`--yes`, a non-TTY CLI, or MCP) auto-answers
 * each prompt with its declared default — mirroring the dry-run interpreter's
 * resolution, so a real run and a preview agree. The handler + log routing ride
 * `rt.exec`, which the dispatcher (and the MCP handler) spread into the node
 * interpreter on the REAL-run branch only.
 *
 * NOTE: `rt.exec` carries no `cwd`. Unlike `create` — whose generator emits
 * RELATIVE output paths and so threads `rt.cwd` as the interpreter's per-call
 * write root — setup's operations build ABSOLUTE effect paths themselves from
 * `rt.cwd` (`skillsPath(cwd)`, `resolve(cwd, …)`, `completionScriptPath`). The
 * interpreter resolves relative fs paths against `RunTaskOptions.cwd` and leaves
 * absolute paths unchanged, so setup's already-absolute paths need no per-call
 * base here — this sets `promptHandler`/`onLog`/`signal` only.
 */

import { createInterface } from "node:readline";
import type { Effect } from "@canonical/task";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";

/** A resolved `Prompt` effect the handler answers. */
type PromptEffect = Effect & { _tag: "Prompt" };

/**
 * Answer a prompt with its declared default (the dry-run interpreter's rule).
 * Used for `--yes`, a non-TTY CLI, and every MCP call.
 *
 * Setup emits ONLY `ConfirmPrompt` (setupAll/setupMcp are its sole prompt
 * sources), so only confirm is handled — a non-confirm prompt (which setup
 * never emits) declines rather than fabricating a typed default.
 */
export async function autoAnswerDefaults(
  effect: PromptEffect,
): Promise<unknown> {
  const { question } = effect;
  return question.type === "confirm" ? (question.default ?? false) : false;
}

/** A readline yes/no confirm session for an attended TTY. Prompts on stderr. */
function interactiveConfirm(): (effect: PromptEffect) => Promise<unknown> {
  return async (effect) => {
    const question = effect.question;
    if (question.type !== "confirm") return autoAnswerDefaults(effect);
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    try {
      const hint = question.default ? "Y/n" : "y/N";
      const answer = await new Promise<string>((resolve) => {
        rl.question(`${question.message} [${hint}] `, resolve);
      });
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === "") return question.default ?? false;
      return trimmed === "y" || trimmed === "yes";
    } finally {
      rl.close();
    }
  };
}

/**
 * Pick the prompt handler from the interaction context and wire `rt.exec`.
 *
 * Call it as the LAST act of a setup verb's `run`, before returning the Task —
 * the dispatcher reads `rt.exec` back on the real-run branch.
 *
 * @param rt - The per-invocation runtime (mutated: `rt.exec` is set).
 */
export function applyPromptStrategy(rt: PragmaRuntime): void {
  const interaction = rt.interaction ?? {
    isTTY: false,
    transport: "cli" as const,
    yes: true,
  };
  const handler =
    interaction.isTTY && !interaction.yes
      ? interactiveConfirm()
      : autoAnswerDefaults;
  rt.exec = {
    promptHandler: handler,
    onLog: (_level, message) => process.stderr.write(`${message}\n`),
    signal: interaction.signal,
  };
}
