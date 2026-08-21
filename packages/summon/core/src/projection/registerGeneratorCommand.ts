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
 * The designed excess-positional error. Commander's default is a generic "too
 * many arguments"; the wrapper owns this message in BOTH CLIs: the stray is
 * named, and when it matches a sibling or child tree segment the corrected
 * command is suggested (`summon component react svelte …` almost certainly
 * meant `summon component svelte …`).
 *
 * The suggestion scans EVERY operand, not just the excess ones: in
 * `summon component react svelte MyComponent` it is `svelte` — bound as the
 * positional — that names the intended sibling, while `MyComponent` is what
 * overflowed. First matching operand wins; a child segment beats a sibling.
 *
 * @param binName - The root program name.
 * @param entryPath - The invoked leaf's path segments.
 * @param stray - The first unexpected operand.
 * @param operands - Every operand the command received (bound + excess).
 * @param siblings - The leaf's sibling segments (other children of its parent).
 * @param children - The leaf's own child segments (runnable-namespace case).
 * @returns The full error text (one or two lines, no trailing newline).
 */
export function excessArgumentMessage(
  binName: string,
  entryPath: readonly string[],
  stray: string,
  operands: readonly string[],
  siblings: ReadonlySet<string>,
  children: ReadonlySet<string>,
): string {
  const error = `error: unexpected argument "${stray}"`;
  for (const operand of operands) {
    if (children.has(operand)) {
      return `${error}\nDid you mean '${[binName, ...entryPath, operand].join(" ")}'?`;
    }
    if (siblings.has(operand)) {
      return `${error}\nDid you mean '${[binName, ...entryPath.slice(0, -1), operand].join(" ")}'?`;
    }
  }
  return error;
}

/** The root program's name (for suggestions), walking up from a leaf. */
function rootName(cmd: Command): string {
  let root = cmd;
  while (root.parent) root = root.parent;
  return root.name();
}

/** The sibling and child segment sets of one barrel entry. */
function segmentNeighbours(
  entry: CommandEntry,
  barrel: readonly CommandEntry[],
): { siblings: Set<string>; children: Set<string> } {
  const siblings = new Set<string>();
  const children = new Set<string>();
  const parent = entry.path.slice(0, -1).join("/");
  const self = entry.path.join("/");
  for (const other of barrel) {
    const otherParent = other.path.slice(0, -1).join("/");
    const last = other.path[other.path.length - 1] as string;
    if (otherParent === parent && other.path.join("/") !== self) {
      siblings.add(last);
    }
    if (otherParent === self) {
      children.add(last);
    }
  }
  return { siblings, children };
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
 * The leaf opts into Commander's excess-argument tolerance and the action
 * wrapper OWNS the overflow instead: a stray operand beyond the declared
 * positional errors with the designed `unexpected argument` message (stderr,
 * exit 2) and never reaches the host action — in both CLIs. This is what
 * kills the silent-positional-drop class (`summon component react MyComponent
 * Extra` used to bind nothing and say nothing).
 *
 * @param cmd - The command to configure.
 * @param entry - The barrel entry (carries the generator).
 * @param barrel - The whole barrel (for sibling/child suggestions).
 * @param host - The host seam.
 * @param positionalPrompt - The generator's positional prompt, when the
 *   command spec declared one.
 */
function configureGeneratorCommand(
  cmd: Command,
  entry: CommandEntry,
  barrel: readonly CommandEntry[],
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

  // The wrapper owns excess operands (designed message, not Commander's).
  cmd.allowExcessArguments(true);
  const declaredPositionals = positionalPrompt ? 1 : 0;
  const { siblings, children } = segmentNeighbours(entry, barrel);

  // Add action: guard excess operands, normalize Commander's calling
  // convention, then hand off.
  cmd.action(async (...actionArgs: unknown[]) => {
    if (cmd.args.length > declaredPositionals) {
      const stray = cmd.args[declaredPositionals] as string;
      const message = excessArgumentMessage(
        rootName(cmd),
        entry.path,
        stray,
        cmd.args,
        siblings,
        children,
      );
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
      return;
    }
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
        configureGeneratorCommand(existingCmd, entry, barrel, host);
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

      configureGeneratorCommand(cmd, entry, barrel, host, positionalPrompt);
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
