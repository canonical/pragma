/**
 * Bridge between Task<void> and CommandResult.
 *
 * Handles dry-run (collect effects, format for display), --yes mode
 * (auto-confirm prompts), and production execution with interactive
 * readline-based prompts.
 *
 * @note Impure — executes tasks, writes to stderr, reads stdin.
 */

import { createInterface } from "node:readline";
import {
  type CommandResult,
  createExitResult,
  createOutputResult,
  formatEffectLine,
  isVisibleEffect,
} from "@canonical/cli-core";
import { dryRun, type Effect, runTask, type Task } from "@canonical/task";

export interface SetupTaskOptions {
  readonly dryRun?: boolean;
  readonly yes?: boolean;
  readonly verbose?: boolean;
  readonly llm?: boolean;
  readonly format?: "text" | "json";
}

/**
 * Auto-confirm prompt handler for --yes mode.
 * Returns the default value for each prompt type.
 */
function autoConfirmHandler(
  effect: Effect & { _tag: "Prompt" },
): Promise<unknown> {
  const q = effect.question;
  if (q.type === "confirm") return Promise.resolve(q.default ?? true);
  if (q.type === "select")
    return Promise.resolve(q.default ?? q.choices[0]?.value);
  if (q.type === "multiselect") return Promise.resolve(q.default ?? []);
  return Promise.resolve(q.default ?? "");
}

/**
 * Interactive prompt handler using readline.
 * Supports confirm prompts; other types use defaults.
 */
async function interactivePromptHandler(
  effect: Effect & { _tag: "Prompt" },
): Promise<unknown> {
  const q = effect.question;

  if (q.type === "confirm") {
    const defaultYes = q.default !== false;
    const hint = defaultYes ? "Y/n" : "y/N";
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(`${q.message} [${hint}] `, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });

    if (answer === "") return defaultYes;
    return answer.toLowerCase().startsWith("y");
  }

  // Non-confirm prompts fall back to defaults in D15
  return q.default;
}

/**
 * Format dry-run effects for plain terminal output.
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
 * Format dry-run effects for LLM markdown output.
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
 * Format dry-run effects for JSON output.
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
 * Execute a setup Task<void> and return a CommandResult.
 *
 * - `--dry-run`: collects effects, formats them, returns output result.
 * - `--yes`: auto-confirms all prompts.
 * - default: interactive prompts via readline, log output to stderr.
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

  // Production execution
  const promptHandler = options.yes
    ? autoConfirmHandler
    : interactivePromptHandler;

  const onLog = (
    level: "debug" | "info" | "warn" | "error",
    message: string,
  ): void => {
    if (level === "debug" && !verbose) return;
    process.stderr.write(`${message}\n`);
  };

  try {
    await runTask(task, { promptHandler, onLog });
    return createExitResult(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Setup failed: ${message}\n`);
    return createExitResult(1);
  }
}
