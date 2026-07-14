/**
 * Generator execution dispatch: mode routing → CommandResult.
 *
 * Handles LLM mode, JSON mode, dry-run, and interactive execution. The mode
 * ladder collapses to preview modes (llm/json/dry-run/undo) × execution: real
 * runs go through {@link runGeneratorTask} — the single UI-free execution core
 * shared with the setup commands. When interaction is preferred (an
 * interactive terminal, no `--yes`), the generator's remaining prompts are
 * collected through a caller-injected {@link PromptSession} (from
 * `ctx.promptSession`) and the run then executes in batch — cli-core never
 * owns a UI toolkit. A non-interactive terminal with missing required answers
 * reports the missing flags and exits 3 rather than generating from bare
 * defaults.
 */

import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import { collectUndos, dryRun } from "@canonical/task";
import { runUndo } from "@canonical/task/node";
import { convertCamelToKebab } from "./convertCase.js";
import createExitResult from "./createExitResult.js";
import createGeneratorStamp from "./createGeneratorStamp.js";
import createOutputResult from "./createOutputResult.js";
import createStampOnEffectStart from "./createStampOnEffectStart.js";
import {
  formatEffectLine,
  formatEffectWithContent,
  formatLlmJson,
  formatLlmMarkdown,
  isVisibleEffect,
} from "./formatEffects.js";
import type { AnswerablePrompt } from "./promptForAnswers.js";
import promptForAnswers from "./promptForAnswers.js";
import runGeneratorTask from "./runGeneratorTask.js";
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
 * Validate the resolved answers against each prompt's own constraints:
 * `select` answers must be one of the declared choices, and any `validate`
 * function must accept the value. Returns the first failure message, or null
 * when every applicable answer is valid.
 *
 * Reuses the exact `validate` the interactive prompt already runs, so a
 * flag-driven (non-interactive) run rejects the same bad input a wizard would —
 * e.g. an empty component path or an unknown package type.
 */
const findInvalidAnswer = (
  prompts: readonly PromptDefinition[],
  answers: Record<string, unknown>,
): string | null => {
  for (const prompt of prompts) {
    if (prompt.when && prompt.when(answers) !== true) continue;
    if (!(prompt.name in answers)) continue;
    const value = answers[prompt.name];

    if (
      prompt.type === "select" &&
      prompt.choices &&
      prompt.choices.length > 0 &&
      !prompt.choices.some((choice) => choice.value === value)
    ) {
      const valid = prompt.choices.map((choice) => choice.value).join(", ");
      return `Invalid --${convertCamelToKebab(prompt.name)} "${String(value)}". Valid values: ${valid}.`;
    }

    if (prompt.validate) {
      const verdict = prompt.validate(value);
      if (verdict !== true) {
        const detail = typeof verdict === "string" ? verdict : "invalid value";
        return `Invalid --${convertCamelToKebab(prompt.name)}: ${detail}`;
      }
    }
  }
  return null;
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

/* v8 ignore start — intentional no-op callback invoked by task runtime */
const suppressTaskLogs = (): void => {
  // Intentionally swallow raw task log effects during generator execution.
  // The CLI already renders a structured summary from the dry-run preview.
};
/* v8 ignore stop */

/** Whether both stdin and stdout are attached to an interactive terminal. */
const isInteractiveTerminal = (): boolean =>
  process.stdin.isTTY === true && process.stdout.isTTY === true;

/** Format a single missing prompt as its CLI flag usage. */
const formatMissingFlag = (prompt: PromptDefinition): string => {
  const flag = `--${convertCamelToKebab(prompt.name)}`;
  switch (prompt.type) {
    case "confirm":
      return flag;
    case "multiselect":
      return `${flag} <values...>`;
    default:
      return `${flag} <value>`;
  }
};

/**
 * Build the message shown when interaction is impossible yet answers are still
 * needed. The two failure modes get distinct headers: a non-interactive
 * stdin/stdout (`onTty` false), versus an interactive terminal whose caller
 * injected no prompt session (`onTty` true).
 */
const formatInteractiveUnavailable = (
  prompts: readonly PromptDefinition[],
  provided: Readonly<Record<string, unknown>>,
  onTty: boolean,
): string => {
  const missing = prompts.filter(
    (prompt) =>
      prompt.default === undefined &&
      !prompt.when &&
      !(prompt.name in provided),
  );
  const header = onTty
    ? "No interactive prompt session is available."
    : "Interactive mode is not available on a non-interactive terminal.";
  if (missing.length === 0) {
    return `${header} Provide all required flags.`;
  }
  return [
    header,
    "Provide the missing required flags:",
    ...missing.map((prompt) => `  ${formatMissingFlag(prompt)}`),
  ].join("\n");
};

/**
 * Collect the generator's remaining answers through the caller-injected prompt
 * session, then execute in batch with them. When no interactive session is
 * available — a non-interactive terminal, or a caller that injects none —
 * report the missing required flags and exit 3 rather than generating from
 * bare defaults, preserving the pre-collapse non-interactive behavior.
 *
 * @note Impure — writes prompts/diagnostics to stderr, reads stdin, and on
 * success performs the generator's effects via the batch re-dispatch.
 */
const runInteractiveExecution = async (
  gen: GeneratorDefinition,
  cliAnswers: Record<string, unknown>,
  params: Record<string, unknown>,
  ctx: CommandContext,
): Promise<CommandResult> => {
  // Only construct a session on an interactive terminal — building one eagerly
  // on a non-TTY would open (and leak) a readline handle we immediately discard.
  const onTty = isInteractiveTerminal();
  const session = onTty ? ctx.promptSession?.() : undefined;
  if (session === undefined) {
    process.stderr.write(
      `${formatInteractiveUnavailable(gen.prompts, cliAnswers, onTty)}\n`,
    );
    return createExitResult(3);
  }

  let answers: Record<string, unknown>;
  process.stderr.write("\n");
  try {
    answers = await runGeneratorTask(
      promptForAnswers(gen.prompts as readonly AnswerablePrompt[], cliAnswers),
      { promptHandler: session.answerPrompt },
    );
  } catch (error) {
    // Ctrl-C aborts the wizard — never fall through to executing the command.
    if (session.wasInterrupted()) {
      return createExitResult(130);
    }
    throw error;
  } finally {
    session.dispose();
  }

  return executeGenerator(gen, { ...params, ...answers, yes: true }, ctx);
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
 * 3. Undo (dry-run/execution) with all answers → undo output
 * 4. Interactive terminal, no --yes → prompt then execute via the session seam
 * 5. Dry-run with all answers → formatted effect output
 * 6. Batch execution with all answers → run through the shared core
 * 7. Otherwise → prompt then execute (interactive) or exit 3 (non-interactive)
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

  // Reject invalid flag-supplied answers before any dispatch (an unknown select
  // value, or a value the prompt's own validator rejects such as an empty path).
  // Only the answers the user actually provided are checked; missing ones are
  // still collected interactively where possible.
  const invalidAnswer = findInvalidAnswer(gen.prompts, cliAnswers);
  if (invalidAnswer !== null) {
    process.stderr.write(`${invalidAnswer}\n`);
    return createExitResult(3);
  }

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

  // Interactive terminal (no --yes): prefer prompting over silently accepting
  // defaults or auto-confirming the plan. Answers flow through the injected
  // session; execution then re-dispatches in batch.
  if (shouldPreferInteractive) {
    return runInteractiveExecution(gen, cliAnswers, params, ctx);
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

  // Batch execution with all answers: run the task immediately through the
  // shared execution core, stamping generated files exactly as summon does so
  // both binaries write byte-identical output.
  if (hasAllAnswers) {
    const task = gen.generate(answersWithDefaults);
    const preview = dryRun(task);

    const stampEnabled = params.generatedStamp !== false;
    await runGeneratorTask(task, {
      cwd: ctx.cwd,
      onLog: suppressTaskLogs,
      onEffectStart: stampEnabled
        ? createStampOnEffectStart(createGeneratorStamp(gen))
        : undefined,
    });

    const output = renderEffectsOutput(preview.effects, {
      verbose,
      showFiles,
      completionMessage: "Generation complete.",
    });
    return createOutputResult(output, { plain: (s) => s });
  }

  // Missing required answers on a path that did not prefer interaction (e.g.
  // --yes, or a non-interactive terminal): prompt through the session when one
  // is available, else report the missing flags and exit 3.
  return runInteractiveExecution(gen, cliAnswers, params, ctx);
}
