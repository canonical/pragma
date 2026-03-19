/**
 * Register commands from a command barrel onto a Commander program.
 *
 * Handles option wiring, grouped help, answer extraction, mode expansion
 * (--llm, --format json), and the action handler for each generator command.
 *
 * @note Impure — writes to stdout/stderr, renders Ink components.
 */

import {
  formatEffectLine,
  formatEffectWithContent,
  formatLlmJson,
  formatLlmMarkdown,
  isVisibleEffect,
} from "@canonical/cli-core";
import type {
  GeneratorDefinition,
  PromptDefinition,
  StampConfig,
} from "@canonical/summon-core";
import { dryRun } from "@canonical/task";
import chalk from "chalk";
import type { Command } from "commander";
import { render } from "ink";
import { App } from "../components/App.js";
import type { CommandEntry, OptionInfo } from "./types.js";

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Convert camelCase to kebab-case.
 * withTests -> with-tests
 */
const toKebabCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const buildOptionInfo = (prompt: PromptDefinition): OptionInfo => {
  const kebabName = toKebabCase(prompt.name);
  const flagName = `--${kebabName}`;

  // NOTE: We intentionally do NOT pass defaultValue to Commander.
  // Defaults are handled by applyDefaults() after prompting, so we can
  // distinguish between "user didn't provide" vs "user provided default value".

  switch (prompt.type) {
    case "confirm": {
      const defaultVal = prompt.default === true;
      if (defaultVal) {
        return {
          flags: `--no-${kebabName}`,
          description: `${prompt.message}`,
          group: prompt.group,
          promptName: prompt.name,
          kebabName,
        };
      }
      return {
        flags: flagName,
        description: `${prompt.message}`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
    case "select": {
      const choices = prompt.choices?.map((c) => c.value).join("|") ?? "";
      return {
        flags: `${flagName} <value>`,
        description: `${prompt.message} [${choices}]`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
    case "multiselect": {
      return {
        flags: `${flagName} <values>`,
        description: `${prompt.message} (comma-separated)`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
    default: {
      return {
        flags: `${flagName} <value>`,
        description: `${prompt.message}`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
  }
};

/**
 * Add prompt-based options to a Commander command.
 */
const addPromptOptions = (cmd: Command, prompts: PromptDefinition[]): void => {
  for (const prompt of prompts) {
    const info = buildOptionInfo(prompt);
    cmd.option(info.flags, info.description, info.defaultValue);
  }
};

/**
 * Configure custom help with grouped options for a command.
 */
const configureGroupedHelp = (
  cmd: Command,
  prompts: PromptDefinition[],
): void => {
  // Collect option info by group
  const groups = new Map<string, OptionInfo[]>();
  const defaultGroupName = "Generator Options";

  for (const prompt of prompts) {
    const info = buildOptionInfo(prompt);
    const groupName = info.group ?? defaultGroupName;
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName)?.push(info);
  }

  // Only configure custom help if there are grouped options
  if (groups.size <= 1 && !prompts.some((p) => p.group)) {
    return;
  }

  // Override help output using configureHelp
  cmd.configureHelp({
    formatHelp: (cmd, helper) => {
      const termWidth = 28; // Fixed width for option flags column

      const formatItem = (
        term: string,
        description: string,
        defaultVal?: string,
      ): string => {
        const fullDesc = defaultVal
          ? `${description} (default: ${JSON.stringify(defaultVal)})`
          : description;

        if (description) {
          const padding = " ".repeat(Math.max(termWidth - term.length, 2));
          return `  ${term}${padding}${fullDesc}`;
        }
        return `  ${term}`;
      };

      let output = "";

      // Usage
      output += `Usage: ${helper.commandUsage(cmd)}\n`;

      // Description
      const desc = helper.commandDescription(cmd);
      if (desc) {
        output += `\n${desc}\n`;
      }

      // Built-in options (Global Options group)
      output += "\nGlobal Options:\n";
      output += formatItem("-d, --dry-run", "Preview without writing files");
      output += "\n";
      output += formatItem(
        "-y, --yes",
        "Skip confirmation prompts and preview",
      );
      output += "\n";
      output += formatItem("-v, --verbose", "Show debug output");
      output += "\n";
      output += formatItem("--show-files", "Show file contents in dry-run");
      output += "\n";
      output += formatItem("--no-preview", "Skip the file preview");
      output += "\n";
      output += formatItem(
        "--no-generated-stamp",
        "Disable generated file stamp comments",
      );
      output += "\n";
      output += formatItem(
        "-l, --llm",
        "Dry-run with markdown output, no prompts, no stamps",
      );
      output += "\n";
      output += formatItem(
        "--format <type>",
        "Output format: json (dry-run, no prompts, no stamps)",
      );
      output += "\n";
      output += formatItem("-h, --help", "display help for command");
      output += "\n";

      // Grouped prompt options
      for (const [groupName, options] of groups) {
        output += `\n${groupName}:\n`;
        for (const opt of options) {
          output += formatItem(opt.flags, opt.description, opt.defaultValue);
          output += "\n";
        }
      }

      return output;
    },
  });
};

/**
 * Extract answers from Commander options based on prompts.
 */
const extractAnswers = (
  options: Record<string, unknown>,
  prompts: PromptDefinition[],
): Record<string, unknown> => {
  const answers: Record<string, unknown> = {};

  for (const prompt of prompts) {
    const value = options[prompt.name];

    if (value !== undefined) {
      switch (prompt.type) {
        case "confirm": {
          const boolValue = Boolean(value);
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
 * Check if all required prompts have answers.
 */
const hasAllRequiredAnswers = (
  prompts: GeneratorDefinition["prompts"],
  answers: Record<string, unknown>,
): boolean => {
  for (const prompt of prompts) {
    if (prompt.when) continue;
    if (!(prompt.name in answers) && prompt.default === undefined) {
      return false;
    }
  }
  return true;
};

/**
 * Apply defaults for prompts that don't have answers.
 */
const applyDefaults = (
  prompts: GeneratorDefinition["prompts"],
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
 * Configure a command with generator options and action.
 */
const configureGeneratorCommand = (
  cmd: Command,
  generator: GeneratorDefinition,
  positionalPrompt?: PromptDefinition,
): void => {
  // Add prompt-based options
  addPromptOptions(cmd, generator.prompts);

  // Configure grouped help display
  configureGroupedHelp(cmd, generator.prompts);

  // Add action
  cmd.action(
    async (
      positionalArg: string | Record<string, unknown> | undefined,
      cmdOptions?: Record<string, unknown>,
    ) => {
      let actualOptions: Record<string, unknown>;

      if (positionalPrompt) {
        actualOptions = cmdOptions ?? {};
      } else {
        actualOptions = (positionalArg as Record<string, unknown>) ?? {};
      }

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

      // If positional argument was provided, add it to the answers
      if (
        positionalPrompt &&
        typeof positionalArg === "string" &&
        positionalArg
      ) {
        cliAnswers[positionalPrompt.name] = positionalArg;
      }

      // Apply defaults for checking if we have all required answers
      const answersWithDefaults = applyDefaults(generator.prompts, cliAnswers);

      // Determine execution mode
      const hasAllAnswers = hasAllRequiredAnswers(
        generator.prompts,
        answersWithDefaults,
      );
      const isTTY = process.stdin.isTTY === true;
      const skipPrompts = actualOptions.yes === true;

      // Build stamp config if stamps are enabled (default: enabled)
      const stampEnabled = actualOptions.generatedStamp !== false;
      const stamp: StampConfig | undefined = stampEnabled
        ? {
            generator: generator.meta.name,
            version: generator.meta.version,
          }
        : undefined;

      if (hasAllAnswers && actualOptions.dryRun && !isTTY) {
        // Batch dry-run mode (non-interactive)
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
      } else {
        // Interactive mode
        const shouldSkipPrompts =
          skipPrompts || Object.keys(cliAnswers).length > 0;
        const passedAnswers = shouldSkipPrompts
          ? answersWithDefaults
          : undefined;

        const shouldShowPreview = skipPrompts
          ? false
          : (actualOptions.preview as boolean);

        const { waitUntilExit } = render(
          <App
            generator={generator}
            preview={shouldShowPreview}
            dryRunOnly={actualOptions.dryRun as boolean}
            verbose={actualOptions.verbose as boolean}
            answers={passedAnswers}
            stamp={stamp}
          />,
        );

        await waitUntilExit();
      }
    },
  );
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
  const commandMap = new Map<string, Command>();
  commandMap.set("", rootCmd);

  for (const entry of barrel) {
    const name = entry.path[entry.path.length - 1];
    const parentPath = entry.path.slice(0, -1).join("/");
    const currentPath = entry.path.join("/");

    // Skip if already registered (can happen with namespace + runnable at same path)
    const existingCmd = commandMap.get(currentPath);
    if (existingCmd) {
      if (entry.generator) {
        configureGeneratorCommand(existingCmd, entry.generator);
      }
      continue;
    }

    // Get or create parent command
    const parentCmd = commandMap.get(parentPath) ?? rootCmd;

    if (entry.generator) {
      const positionalPrompt = entry.generator.prompts.find(
        (p) => p.positional,
      );

      const commandSpec = positionalPrompt
        ? `${name} [${toKebabCase(positionalPrompt.name)}]`
        : name;

      const cmd = parentCmd
        .command(commandSpec)
        .description(entry.generator.meta.description)
        .option("-d, --dry-run", "Preview without writing files")
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

      if (positionalPrompt) {
        const positionalName = toKebabCase(positionalPrompt.name);
        cmd.usage(`[${positionalName}] [options]`);
      }

      configureGeneratorCommand(cmd, entry.generator, positionalPrompt);
      commandMap.set(currentPath, cmd);
    } else {
      const cmd = parentCmd
        .command(name)
        .description(entry.description ?? `${name} commands`);

      commandMap.set(currentPath, cmd);
    }
  }
}
