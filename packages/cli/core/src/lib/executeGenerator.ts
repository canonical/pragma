/**
 * Generator execution dispatch: mode routing → CommandResult.
 *
 * Handles LLM mode, JSON mode, dry-run, and interactive fallback.
 * Does NOT call runTask for real execution — the binary handles that
 * via the interactive result's spec.
 */

import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import { collectUndos, dryRun, runTask, runUndo } from "@canonical/task";
import createInteractiveResult from "./createInteractiveResult.js";
import createOutputResult from "./createOutputResult.js";
import {
  formatEffectLine,
  formatEffectWithContent,
  formatLlmJson,
  formatLlmMarkdown,
  isVisibleEffect,
} from "./formatEffects.js";
import type { CommandContext, CommandResult } from "./types.js";

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Extract typed answers from CLI params based on prompt definitions.
 *
 * Handles Commander's --no-X quirk for confirm prompts and
 * comma-separated multiselect values.
 */
const extractTypedAnswers = (
  params: Record<string, unknown>,
  prompts: readonly PromptDefinition[],
): Record<string, unknown> => {
  const answers: Record<string, unknown> = {};

  for (const prompt of prompts) {
    const value = params[prompt.name];

    if (value !== undefined) {
      switch (prompt.type) {
        case "confirm": {
          const boolValue = Boolean(value);
          // For confirm prompts, Commander always sets a value due to --no-X pattern.
          // Only include if the value differs from the prompt's default,
          // which indicates the user explicitly used the flag.
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
};

/**
 * Apply defaults for prompts that don't have answers.
 */
const applyDefaults = (
  prompts: readonly PromptDefinition[],
  answers: Record<string, unknown>,
): Record<string, unknown> => {
  const result = { ...answers };
  for (const prompt of prompts) {
    if (!(prompt.name in result) && prompt.default !== undefined) {
      result[prompt.name] = prompt.default;
    }
  }
  return result;
};

/**
 * Check if all required prompts have answers.
 */
const hasAllRequiredAnswers = (
  prompts: readonly PromptDefinition[],
  answers: Record<string, unknown>,
): boolean => {
  for (const prompt of prompts) {
    // Skip prompts with `when` conditions - they may be optional
    if (prompt.when) continue;

    // Check if we have an answer (including falsy values like false, 0, "")
    if (!(prompt.name in answers) && prompt.default === undefined) {
      return false;
    }
  }
  return true;
};

/**
 * Render visible task effects into line-based CLI output.
 */
const renderEffectsOutput = (
  effects: ReturnType<typeof dryRun>["effects"],
  options: {
    readonly verbose: boolean;
    readonly showFiles: boolean;
    readonly completionMessage: string;
    readonly showFilesTip?: boolean;
  },
): string => {
  const seenDirPaths = new Set<string>();
  const visibleEffects = effects.filter((effect) => {
    if (!isVisibleEffect(effect, options.verbose)) return false;
    if (effect._tag === "MakeDir") {
      if (seenDirPaths.has(effect.path)) return false;
      seenDirPaths.add(effect.path);
    }
    return true;
  });

  const lines: string[] = [""];
  for (const [i, effect] of visibleEffects.entries()) {
    const isLast = i === visibleEffects.length - 1;
    lines.push(
      options.showFiles
        ? formatEffectWithContent(effect, isLast)
        : formatEffectLine(effect, isLast),
    );
  }
  lines.push("");
  lines.push(options.completionMessage);
  if (options.showFilesTip === true && !options.showFiles) {
    lines.push("Tip: Use --show-files to see generated file contents");
  }
  lines.push("");

  return lines.join("\n");
};

/**
 * Temporarily run a task in the command context working directory.
 */
const runInCwd = async <T>(cwd: string, work: () => Promise<T>): Promise<T> => {
  const previousCwd = process.cwd();
  if (previousCwd === cwd) {
    return work();
  }

  process.chdir(cwd);
  try {
    return await work();
  } finally {
    process.chdir(previousCwd);
  }
};

const suppressTaskLogs = (): void => {
  // Intentionally swallow raw task log effects during generator execution.
  // The CLI already renders a structured summary from the dry-run preview.
};

// =============================================================================
// Main dispatch
// =============================================================================

/**
 * Execute a generator command, dispatching to the appropriate mode.
 *
 * Mode priority:
 * 1. LLM mode (--llm or globalFlags.llm) → dry-run + markdown output
 * 2. JSON mode (--format json or globalFlags.format=json) → dry-run + JSON output
 * 3. Dry-run with all answers → formatted effect output
 * 4. Interactive TTY session with no explicit generator answers → interactive result
 * 5. Otherwise → batch execution or interactive fallback
 */
export default async function executeGenerator(
  gen: GeneratorDefinition,
  params: Record<string, unknown>,
  ctx: CommandContext,
): Promise<CommandResult> {
  // Expand --llm: set dryRun, showFiles, yes, no stamp
  const isLlm = params.llm === true || ctx.globalFlags.llm;
  if (isLlm) {
    params.dryRun = true;
    params.showFiles = true;
    params.yes = true;
    params.generatedStamp = false;
  }

  // Expand --format json: same as llm
  const isJson = params.format === "json" || ctx.globalFlags.format === "json";
  if (isJson) {
    params.dryRun = true;
    params.showFiles = true;
    params.yes = true;
    params.generatedStamp = false;
  }

  const verbose = ctx.globalFlags.verbose || params.verbose === true;
  const isDryRun = params.dryRun === true;
  const isUndo = params.undo === true;
  const showFiles = params.showFiles === true;

  // Extract typed answers from CLI params
  const cliAnswers = extractTypedAnswers(params, gen.prompts);
  const answersWithDefaults = applyDefaults(gen.prompts, cliAnswers);
  const hasAllAnswers = hasAllRequiredAnswers(gen.prompts, answersWithDefaults);
  const shouldPreferInteractive =
    !isLlm &&
    !isJson &&
    params.yes !== true &&
    process.stdin.isTTY === true &&
    process.stdout.isTTY === true;

  // LLM mode: dry-run + markdown
  if (isLlm && hasAllAnswers) {
    const task = gen.generate(answersWithDefaults);
    const result = dryRun(task);
    const markdown = formatLlmMarkdown(
      gen,
      answersWithDefaults,
      result.effects,
      verbose,
    );
    return createOutputResult(markdown, { plain: (s) => s });
  }

  // JSON mode: dry-run + structured JSON
  if (isJson && hasAllAnswers) {
    const task = gen.generate(answersWithDefaults);
    const result = dryRun(task);
    const data = formatLlmJson(
      gen,
      answersWithDefaults,
      result.effects,
      verbose,
    );
    return createOutputResult(data, {
      plain: (d) => `${JSON.stringify(d, null, 2)}\n`,
    });
  }

  // Undo dry-run: show what undo would do
  if (isUndo && isDryRun && hasAllAnswers) {
    const task = gen.generate(answersWithDefaults);
    const undos = collectUndos(task);
    if (undos.length === 0) {
      return createOutputResult("Nothing to undo.\n", { plain: (s) => s });
    }
    const lines = [
      "",
      `Undo would reverse ${undos.length} step${undos.length === 1 ? "" : "s"}.`,
      "",
      "Dry-run complete. No changes were made.",
      "",
    ];
    return createOutputResult(lines.join("\n"), { plain: (s) => s });
  }

  // Undo execution: run undo with all answers
  if (isUndo && hasAllAnswers) {
    const task = gen.generate(answersWithDefaults);
    try {
      const result = await runInCwd(ctx.cwd, () =>
        runUndo(task, { onLog: suppressTaskLogs }),
      );
      if (result.undoCount === 0) {
        return createOutputResult("Nothing to undo.\n", { plain: (s) => s });
      }
      return createOutputResult(
        `Undo complete (${result.undoCount} step${result.undoCount === 1 ? "" : "s"} reversed).\n`,
        { plain: (s) => s },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return createOutputResult(`Undo failed: ${message}\n`, {
        plain: (s) => s,
      });
    }
  }

  // Interactive TTY session: prefer prompting/previews over silently
  // accepting defaults or auto-confirming the plan.
  if (shouldPreferInteractive) {
    const stampEnabled = params.generatedStamp !== false;
    const stamp = stampEnabled
      ? { generator: gen.meta.name, version: gen.meta.version }
      : undefined;

    return createInteractiveResult({
      generator: gen,
      partialAnswers: cliAnswers,
      options: {
        dryRunOnly: false,
        undo: false,
        verbose,
        stamp,
        preview: params.preview !== false,
      },
    });
  }

  // Dry-run with all answers: formatted effect lines
  if (isDryRun && hasAllAnswers) {
    const task = gen.generate(answersWithDefaults);
    const result = dryRun(task);

    const output = renderEffectsOutput(result.effects, {
      verbose,
      showFiles,
      completionMessage: "Dry-run complete. No files were modified.",
      showFilesTip: true,
    });
    return createOutputResult(output, { plain: (s) => s });
  }

  // Batch execution with all answers: run the task immediately.
  if (hasAllAnswers) {
    const task = gen.generate(answersWithDefaults);
    const preview = dryRun(task);

    await runInCwd(ctx.cwd, () => runTask(task, { onLog: suppressTaskLogs }));

    const output = renderEffectsOutput(preview.effects, {
      verbose,
      showFiles,
      completionMessage: "Generation complete.",
    });
    return createOutputResult(output, { plain: (s) => s });
  }

  // Interactive result — binary decides how to render
  const stampEnabled = params.generatedStamp !== false;
  const stamp = stampEnabled
    ? { generator: gen.meta.name, version: gen.meta.version }
    : undefined;

  return createInteractiveResult({
    generator: gen,
    partialAnswers: cliAnswers,
    options: {
      dryRunOnly: isDryRun,
      undo: isUndo,
      verbose,
      stamp,
      preview: params.preview !== false,
    },
  });
}
