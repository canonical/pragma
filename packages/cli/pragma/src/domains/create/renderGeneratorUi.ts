/**
 * Route a generator run to the right front-end.
 *
 * On an interactive terminal (no `--yes`, not a machine-output or preview-only
 * mode), render summon's Ink `App` — the same colored prompt sequence,
 * operations recap, and "Proceed?" confirmation the `summon` binary shows — so
 * `pragma create`/`setup` match summon exactly without duplicating the UI. In
 * every other case (piped/CI, `--yes`, `--llm`/`--format json`, `--dry-run`,
 * `--undo`) fall back to the shared UI-free {@link executeGenerator}, which owns
 * the batch, preview, and machine-readable paths.
 */

import {
  type CommandContext,
  type CommandResult,
  createExitResult,
  createGeneratorStamp,
  executeGenerator,
} from "@canonical/cli-core";
import type { GeneratorDefinition } from "@canonical/summon-core";

/** Whether both stdin and stdout are attached to an interactive terminal. */
function isInteractiveTerminal(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

/**
 * Run a generator, preferring summon's rich Ink UI when interactive.
 *
 * @param gen - The generator to run.
 * @param params - Parsed CLI params (flags + positional answers).
 * @param ctx - The command context (global flags, cwd).
 * @returns A CommandResult; the Ink path exits 0 after the UI closes.
 * @note Impure — may take over the terminal via Ink and perform the run.
 */
export default async function renderGeneratorUi(
  gen: GeneratorDefinition,
  params: Record<string, unknown>,
  ctx: CommandContext,
): Promise<CommandResult> {
  const isLlm = params.llm === true || ctx.globalFlags.llm;
  const isJson = params.format === "json" || ctx.globalFlags.format === "json";
  const wantsBatch =
    params.yes === true ||
    params.dryRun === true ||
    params.undo === true ||
    isLlm ||
    isJson;

  // Machine/preview/batch modes and non-interactive terminals stay on the
  // UI-free executor.
  if (wantsBatch || !isInteractiveTerminal()) {
    return executeGenerator(gen, params, ctx);
  }

  const { renderApp } = await import("@canonical/cli-ui");
  const stampEnabled = params.generatedStamp !== false;
  await renderApp({
    generator: gen,
    preview: params.preview !== false,
    verbose: ctx.globalFlags.verbose === true,
    stamp: stampEnabled ? createGeneratorStamp(gen) : undefined,
  });
  return createExitResult(0);
}
