/**
 * Register commands from a command barrel onto a Commander program — the
 * summon HOST over the shared registration path in
 * `@canonical/summon-core/projection`.
 *
 * The projection owns everything derivable from the prompts (command specs,
 * prompt options, grouped help, namespace parents); this module contributes
 * only what is summon-shaped: the nine standard flags, the `--llm`/`--format
 * json`/`SUMMON_LLM` mode expansions, and the action body that decides between
 * the batch renderers and the Ink app.
 *
 * @note Impure — writes to stdout/stderr, renders Ink components.
 */

import {
  createGeneratorStamp,
  formatEffectLine,
  formatEffectWithContent,
  formatLlmJson,
  formatLlmMarkdown,
  type GeneratorDefinition,
  isVisibleEffect,
  missingRequiredError,
  type PromptEffect,
  type StampConfig,
  validateAnswers,
} from "@canonical/summon-core";
import {
  applyDefaults,
  decideInteraction,
  explicitAnswersComplete,
  extractAnswers,
  type GeneratorCliHost,
  type HostFlags,
  hasAllRequiredAnswers,
  missingExplicitFlags,
  refusalMessage,
  registerGeneratorCommands,
} from "@canonical/summon-core/projection";
import { dryRun } from "@canonical/task";
import { runUndo } from "@canonical/task/node";
import chalk from "chalk";
import type { Command } from "commander";
import { render } from "ink";
import { App } from "../components/App.js";
import type { CommandEntry } from "./types.js";

// =============================================================================
// The summon host: standard flags + help rows
// =============================================================================

/** Register summon's nine standard per-generator flags. */
function registerStandardFlags(cmd: Command): void {
  cmd
    .option("-d, --dry-run", "Preview without writing files")
    .option("--undo", "Reverse a previously executed generator")
    .option("-y, --yes", "Skip confirmation prompts and preview")
    .option("-v, --verbose", "Show debug output")
    .option("--show-files", "Show file contents in dry-run")
    .option("--no-preview", "Skip the file preview")
    .option("--no-generated-stamp", "Disable generated file stamp comments")
    .option(
      "-l, --llm",
      "LLM mode: dry-run with markdown output, no prompts, no stamps",
    )
    .option(
      "--format <type>",
      "Output format: json (implies dry-run, no prompts, no stamps)",
    );
}

/** Summon's standard-flag rows for the grouped-help Global Options block. */
const STANDARD_FLAG_HELP: HostFlags = [
  { flags: "-d, --dry-run", description: "Preview without writing files" },
  { flags: "-y, --yes", description: "Skip confirmation prompts and preview" },
  { flags: "-v, --verbose", description: "Show debug output" },
  { flags: "--show-files", description: "Show file contents in dry-run" },
  { flags: "--no-preview", description: "Skip the file preview" },
  {
    flags: "--no-generated-stamp",
    description: "Disable generated file stamp comments",
  },
  {
    flags: "-l, --llm",
    description: "Dry-run with markdown output, no prompts, no stamps",
  },
  {
    flags: "--format <type>",
    description: "Output format: json (dry-run, no prompts, no stamps)",
  },
  { flags: "-h, --help", description: "display help for command" },
];

// =============================================================================
// The summon action
// =============================================================================

/** Run the batch (non-interactive) undo path. */
async function runBatchUndo(
  generator: GeneratorDefinition,
  answersWithDefaults: Record<string, unknown>,
): Promise<void> {
  const task = generator.generate(answersWithDefaults);
  try {
    const result = await runUndo(task);
    if (result.undoCount === 0) {
      console.log("Nothing to undo.");
    } else {
      console.log(
        `Undo complete (${result.undoCount} step${result.undoCount === 1 ? "" : "s"} reversed).`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Undo failed: ${message}`);
    process.exitCode = 1;
  }
}

/** Render the batch (non-interactive) dry-run in plain, llm, or json form. */
function runBatchDryRun(
  generator: GeneratorDefinition,
  answersWithDefaults: Record<string, unknown>,
  actualOptions: Record<string, unknown>,
): void {
  const verbose = actualOptions.verbose === true;
  const showFiles = actualOptions.showFiles === true;

  const task = generator.generate(answersWithDefaults);
  const result = dryRun(task);

  if (actualOptions.llm === true) {
    const output = formatLlmMarkdown(
      generator,
      answersWithDefaults,
      result.effects,
      verbose,
    );
    process.stdout.write(output);
  } else if (actualOptions.format === "json") {
    const output = formatLlmJson(
      generator,
      answersWithDefaults,
      result.effects,
      verbose,
    );
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    console.log();
    console.log(chalk.bold.magenta(generator.meta.name));
    console.log(chalk.dim(generator.meta.description));
    console.log();

    // Filter and deduplicate effects
    const seenDirPaths = new Set<string>();
    const visibleEffects = result.effects.filter((e) => {
      if (!isVisibleEffect(e, verbose)) return false;
      if (e._tag === "MakeDir") {
        if (seenDirPaths.has(e.path)) return false;
        seenDirPaths.add(e.path);
      }
      return true;
    });

    console.log(chalk.dim.bold("Plan:"));
    visibleEffects.forEach((effect, index) => {
      const isLast = index === visibleEffects.length - 1;
      if (showFiles) {
        console.log(formatEffectWithContent(effect, isLast));
      } else {
        console.log(formatEffectLine(effect, isLast));
      }
    });

    console.log();
    console.log(chalk.dim("Dry-run complete. No files were modified."));

    if (!showFiles) {
      console.log(
        chalk.dim("Tip: Use --show-files to see generated file contents"),
      );
    }
  }
}

/** The summon action body for one generator invocation. */
async function runGeneratorAction(
  entry: CommandEntry,
  positionalValue: string | undefined,
  actualOptions: Record<string, unknown>,
): Promise<void> {
  const generator = entry.generator;
  /* v8 ignore next -- the projection calls the action only for generator entries. */
  if (!generator) return;

  // Support SUMMON_LLM=1 environment variable
  if (process.env.SUMMON_LLM === "1" && actualOptions.llm !== true) {
    actualOptions.llm = true;
  }

  // Expand --llm flag into its component flags
  if (actualOptions.llm === true) {
    actualOptions.dryRun = true;
    actualOptions.showFiles = true;
    actualOptions.yes = true;
    actualOptions.generatedStamp = false;
  }

  // Expand --format json into its component flags
  if (actualOptions.format === "json") {
    actualOptions.dryRun = true;
    actualOptions.showFiles = true;
    actualOptions.yes = true;
    actualOptions.generatedStamp = false;
  }

  // Extract only explicitly provided CLI answers (not defaults)
  const cliAnswers = extractAnswers(actualOptions, generator.prompts);

  // If the positional argument was provided, add it to the answers
  const positionalPrompt = generator.prompts.find((p) => p.positional);
  if (positionalPrompt && positionalValue !== undefined) {
    cliAnswers[positionalPrompt.name] = positionalValue;
  }

  // Apply defaults once — the batch and run modes consume these.
  const answersWithDefaults = applyDefaults(generator.prompts, cliAnswers);

  // The ONE interaction decision (R2), shared verbatim with pragma. Summon's
  // TTY fact: stdin AND stdout are TTYs (the wizard renders to stdout).
  const { mode } = decideInteraction({
    dryRun: actualOptions.dryRun === true,
    undo: actualOptions.undo === true,
    yes: actualOptions.yes === true,
    isTTY: process.stdin.isTTY === true && process.stdout.isTTY === true,
    explicitComplete: explicitAnswersComplete(generator.prompts, cliAnswers),
  });

  if (mode === "refuse") {
    process.stderr.write(
      `${refusalMessage(missingExplicitFlags(generator.prompts, cliAnswers))}\n`,
    );
    process.exitCode = 2;
    return;
  }

  // Build stamp config if stamps are enabled (default: enabled)
  const stampEnabled = actualOptions.generatedStamp !== false;
  const stamp: StampConfig | undefined = stampEnabled
    ? createGeneratorStamp(generator)
    : undefined;

  // The batch modes run regardless of TTY, on defaults — but never on a
  // missing or invalid answer: they error loudly (exit 2) where the previous
  // decision block silently fell through to Ink.
  if (mode === "batch-undo" || mode === "batch-dry-run") {
    if (!failLoudBatchInput(generator, answersWithDefaults)) return;
    if (mode === "batch-undo") {
      await runBatchUndo(generator, answersWithDefaults);
    } else {
      runBatchDryRun(generator, answersWithDefaults, actualOptions);
    }
    return;
  }

  if (mode === "run") {
    // A fully-determined run: defaults applied, no wizard, no preview gate
    // (the confirm auto-resolves).
    const { waitUntilExit } = render(
      <App
        generator={generator}
        preview={false}
        dryRunOnly={false}
        undo={false}
        verbose={actualOptions.verbose as boolean}
        answers={answersWithDefaults}
        stamp={stamp}
      />,
    );
    await waitUntilExit();
    return;
  }

  // mode === "wizard": ask exactly pendingPrompts(prompts, explicit) — the
  // provided answers are pre-seeded and shown in the completed table.
  const { waitUntilExit } = render(
    <App
      generator={generator}
      preview={actualOptions.preview as boolean}
      dryRunOnly={false}
      undo={false}
      verbose={actualOptions.verbose as boolean}
      answers={cliAnswers}
      askMissing
      stamp={stamp}
    />,
  );
  await waitUntilExit();
}

/**
 * Fail loudly (stderr + exit 2) when a batch mode's answer set is unusable: a
 * required answer has no value even after defaults, or a provided answer fails
 * its prompt's own constraint. Returns true when the batch may proceed.
 */
function failLoudBatchInput(
  generator: GeneratorDefinition,
  answersWithDefaults: Record<string, unknown>,
): boolean {
  if (!hasAllRequiredAnswers(generator.prompts, answersWithDefaults)) {
    const missing = generator.prompts.find(
      (prompt) =>
        !prompt.when &&
        prompt.default === undefined &&
        !(prompt.name in answersWithDefaults),
    );
    /* v8 ignore next -- hasAllRequiredAnswers false implies a missing prompt. */
    if (missing) {
      const effect = {
        _tag: "Prompt",
        question: {
          type: "text",
          name: missing.name,
          message: missing.message,
        },
      } as PromptEffect;
      process.stderr.write(`${missingRequiredError(effect, "flag").message}\n`);
    }
    process.exitCode = 2;
    return false;
  }
  const invalid = validateAnswers(generator.prompts, answersWithDefaults);
  if (invalid !== null) {
    process.stderr.write(`${invalid}\n`);
    process.exitCode = 2;
    return false;
  }
  return true;
}

/** The summon host handed to the shared registration path. */
const summonHost: GeneratorCliHost = {
  standardFlags: {
    register: registerStandardFlags,
    help: STANDARD_FLAG_HELP,
  },
  action: (entry, positionalValue, options) =>
    runGeneratorAction(entry, positionalValue, options),
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Register all commands from a command barrel onto a Commander program.
 *
 * @note Impure — mutates the Commander program.
 */
export default function registerFromBarrel(
  rootCmd: Command,
  barrel: CommandEntry[],
): void {
  registerGeneratorCommands(rootCmd, barrel, summonHost);
}
