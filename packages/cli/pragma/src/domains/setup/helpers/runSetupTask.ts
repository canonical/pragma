import {
  type CommandResult,
  createExitResult,
  createOutputResult,
  formatEffectLine,
  isVisibleEffect,
  runGeneratorTask,
} from "@canonical/cli-core";
import { dryRun, type Effect, runUndo, type Task } from "@canonical/task";
import type { LogLevel } from "../types.js";
import autoConfirmHandler from "./autoConfirmHandler.js";
import interactivePromptHandler from "./interactivePromptHandler.js";

/** Options controlling how {@link runSetupTask} executes. */
export interface SetupTaskOptions {
  readonly dryRun?: boolean;
  readonly undo?: boolean;
  readonly yes?: boolean;
  readonly verbose?: boolean;
  readonly llm?: boolean;
  readonly format?: "text" | "json";
}

/**
 * Pick the prompt handler for a run: auto-confirm defaults under `--yes`, else
 * prompt the user interactively over readline.
 */
function selectPromptHandler(
  yes: boolean,
): (effect: Effect & { _tag: "Prompt" }) => Promise<unknown> {
  return yes ? autoConfirmHandler : interactivePromptHandler;
}

/**
 * Build a task log sink that writes to stderr, hiding debug lines unless
 * verbose is set.
 */
function createStderrLogger(
  verbose: boolean,
): (level: LogLevel, message: string) => void {
  return (level, message) => {
    if (level === "debug" && !verbose) return;
    process.stderr.write(`${message}\n`);
  };
}

/**
 * Format dry-run effects as plain terminal output with tree-style lines.
 *
 * @param effects - Collected effects from the dry-run.
 * @param verbose - Whether to include debug-level effects.
 * @returns Formatted multi-line string.
 */
function formatDryRunPlain(
  effects: readonly Effect[],
  verbose: boolean,
): string {
  const visible = effects.filter((e) => isVisibleEffect(e, verbose));
  if (visible.length === 0) return "Dry run: no visible effects.\n";

  const lines = ["Dry run — the following operations would be performed:\n"];
  for (const [i, effect] of visible.entries()) {
    lines.push(formatEffectLine(effect, i === visible.length - 1));
  }
  lines.push("\nNo changes were made.");
  return lines.join("\n");
}

/**
 * Format dry-run effects as a markdown table for LLM output.
 *
 * @param effects - Collected effects from the dry-run.
 * @param verbose - Whether to include debug-level effects.
 * @returns Markdown-formatted string.
 */
function formatDryRunLlm(effects: readonly Effect[], verbose: boolean): string {
  const visible = effects.filter((e) => isVisibleEffect(e, verbose));
  if (visible.length === 0) return "## Dry Run\n\nNo visible effects.\n";

  const lines = ["## Dry Run\n", "| Action | Detail |", "|--------|--------|"];
  for (const effect of visible) {
    const action = effect._tag;
    const detail =
      "path" in effect
        ? (effect as { path: string }).path
        : "message" in effect
          ? (effect as { message: string }).message
          : "";
    lines.push(`| ${action} | ${detail} |`);
  }
  lines.push("\n---\nDry-run complete. No files were modified.");
  return lines.join("\n");
}

/**
 * Format dry-run effects as a JSON array.
 *
 * @param effects - Collected effects from the dry-run.
 * @returns JSON string with effect summaries.
 */
function formatDryRunJson(effects: readonly Effect[]): string {
  const entries = effects
    .filter((e) => isVisibleEffect(e, true))
    .map((e) => ({
      action: e._tag,
      ...("path" in e ? { path: (e as { path: string }).path } : {}),
      ...("message" in e
        ? { message: (e as { message: string }).message }
        : {}),
    }));
  return `${JSON.stringify(entries, null, 2)}\n`;
}

/**
 * Execute a setup Task and return a CommandResult.
 *
 * Supports three execution modes:
 * - `--dry-run`: collects effects without executing, formats for display.
 * - `--undo`: walks the task tree, collects undo operations, executes in reverse.
 * - default: execution through {@link runGeneratorTask}, with readline-based
 *   prompts on stderr.
 *
 * @param task - The setup Task to execute.
 * @param options - Execution options (dryRun, undo, yes, verbose, llm, format).
 * @returns A CommandResult with exit code or formatted output.
 * @note Impure
 */
export default async function runSetupTask(
  task: Task<void>,
  options: SetupTaskOptions = {},
): Promise<CommandResult> {
  const verbose = options.verbose ?? false;

  // Dry-run mode: collect effects without executing
  if (options.dryRun) {
    const result = dryRun(task);

    if (options.format === "json") {
      const json = formatDryRunJson(result.effects);
      return createOutputResult(json, { plain: (s) => s });
    }
    if (options.llm) {
      const md = formatDryRunLlm(result.effects, verbose);
      return createOutputResult(md, { plain: (s) => s });
    }

    const text = formatDryRunPlain(result.effects, verbose);
    return createOutputResult(text, { plain: (s) => s });
  }

  // Undo mode: walk the task tree, collect undos, execute in reverse
  if (options.undo) {
    const promptHandler = selectPromptHandler(options.yes ?? false);
    const onLog = createStderrLogger(verbose);

    try {
      const result = await runUndo(task, { promptHandler, onLog });
      if (result.undoCount === 0) {
        process.stderr.write("Nothing to undo.\n");
      } else {
        process.stderr.write(
          `Undo complete (${result.undoCount} step${result.undoCount === 1 ? "" : "s"} reversed).\n`,
        );
      }
      return createExitResult(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Undo failed: ${message}\n`);
      return createExitResult(1);
    }
  }

  // Production execution
  const promptHandler = selectPromptHandler(options.yes ?? false);
  const onLog = createStderrLogger(verbose);

  try {
    await runGeneratorTask(task, { promptHandler, onLog });
    return createExitResult(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Setup failed: ${message}\n`);
    return createExitResult(1);
  }
}
