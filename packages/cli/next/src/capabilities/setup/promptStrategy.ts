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
 * NOTE (PR7): `rt.exec` carries NO `cwd` — the PR5 fold removed it from
 * RunnerOptions (the node interpreter resolves paths against `process.cwd()`,
 * and per-call cwd is PR7's job, threaded into the runner AND the path jail
 * atomically). So this sets `promptHandler`/`onLog`/`signal` only, like `create`.
 */

import { createInterface } from "node:readline";
import type { Effect } from "@canonical/task";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";

/** A resolved `Prompt` effect the handler answers. */
type PromptEffect = Effect & { _tag: "Prompt" };

/**
 * Answer a prompt with its declared default (the dry-run interpreter's rule).
 * Used for `--yes`, a non-TTY CLI, and every MCP call.
 */
export async function autoAnswerDefaults(
  effect: PromptEffect,
): Promise<unknown> {
  const question = effect.question;
  switch (question.type) {
    case "confirm":
      return question.default ?? false;
    case "text":
      return question.default ?? "";
    case "select":
      return question.default ?? question.choices[0]?.value ?? "";
    case "multiselect":
      return question.default ?? [];
  }
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
