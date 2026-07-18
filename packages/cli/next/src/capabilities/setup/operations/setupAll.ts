/**
 * `setup` (the self-verb) — run completions + LSP + MCP, each behind a confirm
 * gate. Matches the old shell's `setupAll` (skills stays its own sub-verb).
 *
 * Each sub-op builds its Task in the async-setup phase (doing its own REAL
 * detection), so a `--dry-run` of the whole thing previews accurately. The gates
 * are plain `promptConfirm`s resolved by `rt.exec.promptHandler` — interactively
 * on an attended TTY, auto-confirmed under `--yes`/MCP.
 */

import { $, gen, info, promptConfirm, type Task, when } from "@canonical/task";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import { applyPromptStrategy } from "../promptStrategy.js";
import type { SetupResult } from "../types.js";
import { setupCompletions } from "./setupCompletions.js";
import { setupLsp } from "./setupLsp.js";
import { setupMcp } from "./setupMcp.js";

/**
 * Build the run-all `setup` Task.
 *
 * @param rt - The per-invocation runtime.
 * @returns A Task that runs each confirmed step.
 * @note Impure — each sub-op detects real state before the Task is composed.
 */
export async function setupAll(rt: PragmaRuntime): Promise<Task<SetupResult>> {
  const completionsTask = await setupCompletions(rt);
  const lspTask = await setupLsp(rt);
  const mcpTask = await setupMcp(rt);
  // Sub-ops each wired rt.exec; re-assert so the run-all handler is authoritative.
  applyPromptStrategy(rt);

  return gen(function* () {
    yield* $(info("Setting up pragma for this project..."));
    const steps: string[] = [];

    const doCompletions = yield* $(
      promptConfirm("setup-completions", "Set up shell completions?", true),
    );
    yield* $(
      when(
        doCompletions,
        gen(function* () {
          yield* $(completionsTask);
          steps.push("completions");
        }),
      ),
    );

    const doLsp = yield* $(
      promptConfirm("setup-lsp", "Install the Terrazzo LSP extension?", true),
    );
    yield* $(
      when(
        doLsp,
        gen(function* () {
          yield* $(lspTask);
          steps.push("lsp");
        }),
      ),
    );

    const doMcp = yield* $(
      promptConfirm("setup-mcp", "Configure MCP for AI harnesses?", true),
    );
    yield* $(
      when(
        doMcp,
        gen(function* () {
          yield* $(mcpTask);
          steps.push("mcp");
        }),
      ),
    );

    yield* $(info("Setup complete. Run `pragma doctor` to verify."));
    return { kind: "all" as const, steps };
  });
}
