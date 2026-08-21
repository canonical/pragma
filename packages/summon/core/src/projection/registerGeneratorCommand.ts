/**
 * Register a command barrel onto a Commander program — the ONE registration
 * path both binaries mount the generator tree through. The projection owns
 * everything derivable from the prompts: the command spec (`name
 * [kebab-positional]`), the prompt-derived options, the grouped help, the
 * usage line, and the namespace parents. The HOST owns everything host-shaped
 * — its standard flags, its action body, and (optionally) its namespace
 * behavior — injected through {@link GeneratorCliHost}.
 *
 * Moved from the summon bin's `registerFromBarrel`, which is now a thin host
 * over this.
 *
 * @note Impure — mutates the Commander program.
 */

import type { Command } from "commander";
import buildOptionInfo from "./buildOptionInfo.js";
import { configureGroupedHelp } from "./groupedHelp.js";
import toKebabCase from "./kebab.js";
import type { CommandEntry, HostFlags, PromptLike } from "./types.js";

/** The host seam: what a binary contributes to each registered command. */
export interface GeneratorCliHost {
  /** The host's standard per-generator flags. */
  readonly standardFlags: {
    /** Register the host's standard flags on a leaf command. */
    readonly register: (cmd: Command) => void;
    /** The same flags as `--help` rows for the grouped-help global block. */
    readonly help: HostFlags;
  };
  /**
   * The leaf action. Receives the barrel entry, the positional's value when
   * one was given, Commander's parsed options, and the command itself.
   */
  readonly action: (
    entry: CommandEntry,
    positionalValue: string | undefined,
    options: Record<string, unknown>,
    cmd: Command,
  ) => Promise<void>;
  /** Optional hook run on every namespace (non-runnable) command created. */
  readonly onNamespace?: (cmd: Command, entry: CommandEntry) => void;
}

/** Add prompt-based options to a Commander command. */
function addPromptOptions(cmd: Command, prompts: readonly PromptLike[]): void {
  for (const prompt of prompts) {
    const info = buildOptionInfo(prompt);
    cmd.option(info.flags, info.description, info.defaultValue);
  }
}

/**
 * Normalize Commander's action calling convention: the positional value is the
 * first argument only when the command spec declared one, and it counts only
 * when actually given (a non-empty string).
 *
 * @param actionArgs - Commander's raw action arguments.
 * @param hasPositional - Whether the command spec declared a positional.
 * @returns The positional's value (if given) and the parsed options.
 */
export function splitGeneratorActionArgs(
  actionArgs: readonly unknown[],
  hasPositional: boolean,
): {
  positionalValue: string | undefined;
  options: Record<string, unknown>;
} {
  const [first, second] = actionArgs;
  const options =
    ((hasPositional ? second : first) as Record<string, unknown> | undefined) ??
    {};
  const positionalValue =
    hasPositional && typeof first === "string" && first ? first : undefined;
  return { positionalValue, options };
}

/**
 * Configure a command with generator options and action.
 *
 * @param cmd - The command to configure.
 * @param entry - The barrel entry (carries the generator).
 * @param host - The host seam.
 * @param positionalPrompt - The generator's positional prompt, when the
 *   command spec declared one.
 */
function configureGeneratorCommand(
  cmd: Command,
  entry: CommandEntry,
  host: GeneratorCliHost,
  positionalPrompt?: PromptLike,
): void {
  const generator = entry.generator;
  /* v8 ignore next -- defensive: callers configure only generator entries. */
  if (!generator) return;

  // Add prompt-based options
  addPromptOptions(cmd, generator.prompts);

  // Configure grouped help display
  configureGroupedHelp(cmd, generator.prompts, host.standardFlags.help);

  // Add action: normalize Commander's calling convention, then hand off.
  cmd.action(async (...actionArgs: unknown[]) => {
    const { positionalValue, options } = splitGeneratorActionArgs(
      actionArgs,
      positionalPrompt !== undefined,
    );
    await host.action(entry, positionalValue, options, cmd);
  });
}

/**
 * Register all commands from a command barrel onto a Commander program.
 *
 * @param rootCmd - The program (or parent command) to register onto.
 * @param barrel - The flattened command entries, parents before children.
 * @param host - The host seam (standard flags, action, namespace hook).
 * @note Impure — mutates the Commander program.
 */
export default function registerGeneratorCommands(
  rootCmd: Command,
  barrel: readonly CommandEntry[],
  host: GeneratorCliHost,
): void {
  const commandMap = new Map<string, Command>();
  commandMap.set("", rootCmd);

  for (const entry of barrel) {
    const name = entry.path[entry.path.length - 1] as string;
    const parentPath = entry.path.slice(0, -1).join("/");
    const currentPath = entry.path.join("/");

    // Skip if already registered (can happen with namespace + runnable at same path)
    const existingCmd = commandMap.get(currentPath);
    if (existingCmd) {
      if (entry.generator) {
        configureGeneratorCommand(existingCmd, entry, host);
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
        .description(entry.generator.meta.description);
      host.standardFlags.register(cmd);

      if (positionalPrompt) {
        const positionalName = toKebabCase(positionalPrompt.name);
        cmd.usage(`[${positionalName}] [options]`);
      }

      configureGeneratorCommand(cmd, entry, host, positionalPrompt);
      commandMap.set(currentPath, cmd);
    } else {
      const cmd = parentCmd
        .command(name)
        .description(entry.description ?? `${name} commands`);

      host.onNamespace?.(cmd, entry);
      commandMap.set(currentPath, cmd);
    }
  }
}
