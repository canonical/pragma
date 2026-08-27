/**
 * Register a command barrel onto a Commander program — the ONE registration
 * path both binaries mount the generator tree through. The projection owns
 * everything derivable from the prompts: the command spec (`name
 * [kebab-positional]`), the prompt-derived options, the grouped help, the
 * usage line, and the namespace parents. The HOST owns everything host-shaped
 * — its standard flags, its action body, its outcome effects, and
 * (optionally) its namespace behavior — injected through
 * {@link CommanderHost}.
 *
 * Every designed non-action outcome (the two usage errors, the bare-namespace
 * help) is DECIDED here — content and exit code, the parity facts — and
 * DELIVERED to the host's required `emit` sink as a {@link MountOutcome}.
 * Not one write to `process.stderr` or `process.exitCode` happens in this
 * module; the canonical effect both bins share is
 * {@link import("./emitToProcess.js").default}.
 *
 * @note Impure — mutates the Commander program.
 */

import type { Command } from "commander";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import buildOptionInfo from "../buildOptionInfo.js";
import type { renderGroupedHelp } from "../groupedHelp.js";
import toKebabCase from "../kebab.js";
import type {
  CommandEntry,
  HostFlags,
  PromptLike,
  SurfaceGenerator,
} from "../types.js";
import {
  excessPositionalError,
  type UsageError,
  unknownSegmentError,
} from "../usage.js";
import configureGroupedHelp from "./configureGroupedHelp.js";

/**
 * Every designed non-action outcome of the registered tree. The library
 * DECIDES the content and the exit code (the parity facts); the host
 * EFFECTS them. The exit codes are literals on purpose: a shipped bin
 * applies them verbatim (`emitToProcess`), an in-process host maps them
 * into its own result — neither re-encodes the parity fact.
 */
export type MountOutcome =
  | {
      readonly kind: "usage-error";
      readonly error: UsageError;
      readonly exitCode: 2;
    }
  | {
      readonly kind: "namespace-help";
      readonly help: string;
      readonly exitCode: 1;
    };

/** The host seam: what a binary contributes to each registered command. */
export interface CommanderHost<
  G extends SurfaceGenerator = GeneratorDefinition,
> {
  /** Register the host's standard flags on a leaf command. */
  readonly registerFlags: (cmd: Command) => void;
  /** The same flags as `--help` rows for the grouped-help global block. */
  readonly helpFlags: HostFlags;
  /**
   * The leaf action. Receives the barrel entry, the positional's value when
   * one was given, and Commander's parsed options.
   */
  readonly action: (
    entry: CommandEntry<G>,
    positionalValue: string | undefined,
    options: Record<string, unknown>,
  ) => Promise<void>;
  /** Optional hook run on every namespace (non-runnable) command created. */
  readonly onNamespace?: (cmd: Command, entry: CommandEntry<G>) => void;
  /**
   * Render a leaf's grouped help. Defaults to `renderGroupedHelp` — the
   * shared presentation summon uses; a host with its own help style supplies
   * an alternative implementation of the same function. Optional, unlike
   * `emit`: Commander's `configureHelp` takes exactly one formatter, so an
   * omitted member cannot double-write — it just means the default.
   */
  readonly renderHelp?: typeof renderGroupedHelp;
  /**
   * REQUIRED. The ONE process seam. A host wanting the default presentation
   * passes `emitToProcess`; a host reframing an outcome builds its own bytes
   * from `outcome.error` and applies `outcome.exitCode`.
   */
  readonly emit: (outcome: MountOutcome) => void;
}

/** Add prompt-based options to a Commander command. */
function addPromptOptions(cmd: Command, prompts: readonly PromptLike[]): void {
  for (const prompt of prompts) {
    const info = buildOptionInfo(prompt);
    cmd.option(info.flags, info.description, info.defaultValue);
  }
}

/** The command's full name chain (root/bin name first, leaf last). */
function commandChain(cmd: Command): string[] {
  const chain: string[] = [];
  let current: Command | null = cmd;
  while (current) {
    chain.unshift(current.name());
    current = current.parent;
  }
  return chain;
}

/** The sibling and child segment sets of one barrel entry. */
function segmentNeighbours(
  entry: CommandEntry<SurfaceGenerator>,
  barrel: readonly CommandEntry<SurfaceGenerator>[],
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
 * Module-internal to the adapter (exported for its tests, never on the
 * subpath index): both hosts reach it only through
 * {@link registerGeneratorCommands}.
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
 * positional emits the designed `unexpected argument` outcome (exit 2) and
 * never reaches the host action — in both CLIs. This is what kills the
 * silent-positional-drop class (`summon component react MyComponent Extra`
 * used to bind nothing and say nothing).
 *
 * @param cmd - The command to configure.
 * @param entry - The barrel entry (carries the generator).
 * @param barrel - The whole barrel (for sibling/child suggestions).
 * @param host - The host seam.
 * @param positionalPrompt - The generator's positional prompt, when the
 *   command spec declared one.
 */
function configureGeneratorCommand<G extends SurfaceGenerator>(
  cmd: Command,
  entry: CommandEntry<G>,
  barrel: readonly CommandEntry<G>[],
  host: CommanderHost<G>,
  positionalPrompt?: PromptLike,
): void {
  const generator = entry.generator;
  /* v8 ignore next -- defensive: callers configure only generator entries. */
  if (!generator) return;

  // Add prompt-based options
  addPromptOptions(cmd, generator.prompts);

  // Configure grouped help display (the host's own renderer, when supplied)
  configureGroupedHelp(cmd, generator.prompts, host.helpFlags, host.renderHelp);

  // The wrapper owns excess operands (designed outcome, not Commander's).
  cmd.allowExcessArguments(true);
  const declaredPositionals = positionalPrompt ? 1 : 0;
  const { siblings, children } = segmentNeighbours(entry, barrel);

  // Add action: guard excess operands, normalize Commander's calling
  // convention, then hand off.
  cmd.action(async (...actionArgs: unknown[]) => {
    if (cmd.args.length > declaredPositionals) {
      const stray = cmd.args[declaredPositionals] as string;
      const error = excessPositionalError(
        commandChain(cmd),
        stray,
        cmd.args,
        siblings,
        children,
      );
      host.emit({ kind: "usage-error", error, exitCode: 2 });
      return;
    }
    const { positionalValue, options } = splitGeneratorActionArgs(
      actionArgs,
      positionalPrompt !== undefined,
    );
    await host.action(entry, positionalValue, options);
  });
}

/**
 * Configure a namespace (non-runnable) command: the projection owns the
 * unknown child segment (the shared did-you-mean, exit 2) and the bare
 * invocation (the namespace's own help, exit 1 — both hosts' established
 * shape), each delivered as a {@link MountOutcome}. Excess tolerance makes
 * Commander route an unrecognized first operand to this action instead of
 * its host-divergent `unknownCommand` path; a KNOWN segment still dispatches
 * to the child before the action is consulted, and a runnable entry
 * registered at the same path replaces this action with the leaf's own.
 */
function configureNamespaceCommand<G extends SurfaceGenerator>(
  cmd: Command,
  host: CommanderHost<G>,
): void {
  cmd.allowExcessArguments(true);
  cmd.action(() => {
    const stray = cmd.args[0];
    if (stray !== undefined) {
      const children = cmd.commands.map((child) => child.name());
      host.emit({
        kind: "usage-error",
        error: unknownSegmentError(commandChain(cmd), stray, children),
        exitCode: 2,
      });
      return;
    }
    // Bare namespace: its own help, exit 1. The help is laid out for the
    // stream the parity bytes go to: `{ error: true }` selects the ERROR
    // output context (stderr's width), where the bare call would measure
    // stdout's. Byte-identical under pipes (both default to 80). Computed
    // eagerly on purpose: both shipped hosts consume it, and this is a
    // terminal error path, never a fast path.
    host.emit({
      kind: "namespace-help",
      help: cmd.helpInformation({ error: true }),
      exitCode: 1,
    });
  });
}

/**
 * Register all commands from a command barrel onto a Commander program.
 *
 * @param rootCmd - The program (or parent command) to register onto.
 * @param barrel - The flattened command entries, parents before children.
 * @param host - The host seam (flags, action, namespace hook, emit sink).
 * @note Impure — mutates the Commander program.
 */
export default function registerGeneratorCommands<G extends SurfaceGenerator>(
  rootCmd: Command,
  barrel: readonly CommandEntry<G>[],
  host: CommanderHost<G>,
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
      host.registerFlags(cmd);

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

      configureNamespaceCommand(cmd, host);
      host.onNamespace?.(cmd, entry);
      commandMap.set(currentPath, cmd);
    }
  }
}
