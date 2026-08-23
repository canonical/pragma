/**
 * Register a command barrel onto a Commander program — the ONE registration
 * path both binaries mount the generator tree through. The projection owns
 * everything derivable from the prompts: the command spec (`name
 * [kebab-positional]`), the prompt-derived options, the grouped help, the
 * usage line, and the namespace parents. The HOST owns everything host-shaped
 * — its standard flags, its action body, and (optionally) its namespace
 * behavior and its usage-error presentation — injected through
 * {@link GeneratorCliHost}.
 *
 * Moved from the summon bin's `registerFromBarrel`, which is now a thin host
 * over this.
 *
 * @note Impure — mutates the Commander program.
 */

import type { Command } from "commander";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import buildOptionInfo from "./buildOptionInfo.js";
import { configureGroupedHelp } from "./groupedHelp.js";
import toKebabCase from "./kebab.js";
import type {
  CommandEntry,
  HostFlags,
  PromptLike,
  SurfaceGenerator,
} from "./types.js";

/** The projection's two designed usage-error classes (the writer's tag). */
export type UsageErrorKind = "unknown-segment" | "excess-positional";

/**
 * The structured facts behind a projection usage error, handed to a host's
 * {@link GeneratorCliHost.writeUsageError} alongside the rendered message —
 * so a host reframing the error for a machine format can put the match in a
 * structured field (pragma's envelope `suggestions`) instead of re-parsing
 * the prose.
 */
export interface UsageErrorDetail {
  /** The offending token: the stray operand / unknown segment. */
  readonly stray: string;
  /**
   * The suggested segment, when one matched — per-kind: for
   * `unknown-segment` the candidate that RANKED closest to the stray
   * (fuzzy, substitutable for it); for `excess-positional` the first
   * OPERAND — bound or excess, possibly the stray itself — that exactly
   * names a sibling or child segment (structural, not a substitution).
   */
  readonly suggestion?: string;
  /**
   * The invocation chain the suggestion completes (root/bin name first):
   * `[...chain, suggestion].join(" ")` is exactly the corrected command the
   * message's did-you-mean line names.
   */
  readonly chain: readonly string[];
}

/** The host seam: what a binary contributes to each registered command. */
export interface GeneratorCliHost<
  G extends SurfaceGenerator = GeneratorDefinition,
> {
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
    entry: CommandEntry<G>,
    positionalValue: string | undefined,
    options: Record<string, unknown>,
    cmd: Command,
  ) => Promise<void>;
  /** Optional hook run on every namespace (non-runnable) command created. */
  readonly onNamespace?: (cmd: Command, entry: CommandEntry<G>) => void;
  /**
   * Optional writer for the projection's two USAGE errors — the designed
   * excess-positional and unknown-segment messages. Return `true` to claim
   * the write (a host reframing the message for an explicitly requested
   * machine format — pragma routes both through the same error envelope
   * every other `create` failure emits under `--format json`/`--format
   * llm`, serializing the match PER KIND: the unknown-segment candidate
   * as the bare segment in the envelope's `suggestions`, the
   * excess-positional match as the runnable corrected command in
   * `recovery.cli`, the `[...detail.chain, detail.suggestion]` join);
   * return `false` to leave the default
   * presentation, the message verbatim on stderr — the cross-CLI parity
   * bytes. The projection owns the exit code (2) either way. The return
   * is a REQUIRED `boolean` (not `boolean | void`): a writer that writes
   * and returns nothing would be indistinguishable from one declining,
   * and the projection would write the default line again — a silent
   * double-write. `detail` is REQUIRED for the same honesty: both usage
   * builders return it unconditionally on every branch, so an optional
   * parameter would only buy every reframing host a narrowing it can
   * never exercise (a shorter implementation is assignable regardless).
   */
  readonly writeUsageError?: (
    message: string,
    kind: UsageErrorKind,
    detail: UsageErrorDetail,
  ) => boolean;
}

/** A usage error as built: the rendered message plus its structured facts. */
interface UsageError {
  readonly message: string;
  readonly detail: UsageErrorDetail;
}

/** Write one of the projection's usage errors, host writer first. */
function writeUsageError<G extends SurfaceGenerator>(
  host: GeneratorCliHost<G>,
  usage: UsageError,
  kind: UsageErrorKind,
): void {
  if (host.writeUsageError?.(usage.message, kind, usage.detail) === true) {
    return;
  }
  process.stderr.write(`${usage.message}\n`);
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
 * @param commandChain - The invoked command's full name chain, root (bin
 *   name) first — host-agnostic, so a mounted subtree suggests its real
 *   invocation (`pragma create component svelte`, not a truncated one).
 * @param stray - The first unexpected operand.
 * @param operands - Every operand the command received (bound + excess).
 * @param siblings - The leaf's sibling segments (other children of its parent).
 * @param children - The leaf's own child segments (runnable-namespace case).
 * @returns The rendered error text (one or two lines, no trailing newline)
 *   plus the structured facts a host writer may reframe.
 */
function excessArgumentUsage(
  commandChain: readonly string[],
  stray: string,
  operands: readonly string[],
  siblings: ReadonlySet<string>,
  children: ReadonlySet<string>,
): UsageError {
  const error = `error: unexpected argument "${stray}"`;
  for (const operand of operands) {
    if (children.has(operand)) {
      return {
        message: `${error}\nDid you mean '${[...commandChain, operand].join(" ")}'?`,
        detail: { stray, suggestion: operand, chain: commandChain },
      };
    }
    if (siblings.has(operand)) {
      const chain = commandChain.slice(0, -1);
      return {
        message: `${error}\nDid you mean '${[...chain, operand].join(" ")}'?`,
        detail: { stray, suggestion: operand, chain },
      };
    }
  }
  return { message: error, detail: { stray, chain: commandChain } };
}

/** The rendered text of {@link excessArgumentUsage} (the tested surface). */
export function excessArgumentMessage(
  commandChain: readonly string[],
  stray: string,
  operands: readonly string[],
  siblings: ReadonlySet<string>,
  children: ReadonlySet<string>,
): string {
  return excessArgumentUsage(commandChain, stray, operands, siblings, children)
    .message;
}

/**
 * Damerau-Levenshtein distance (insert / delete / substitute / adjacent
 * transposition) over a flat row-major matrix — `d[i * width + j]` is the
 * distance between `a`'s first `i` chars and `b`'s first `j` chars.
 */
function editDistance(a: string, b: string): number {
  const width = b.length + 1;
  const d: number[] = Array.from({ length: (a.length + 1) * width }, () => 0);
  for (let i = 0; i <= a.length; i += 1) d[i * width] = i;
  for (let j = 0; j <= b.length; j += 1) d[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        (d[(i - 1) * width + j] as number) + 1,
        (d[i * width + j - 1] as number) + 1,
        (d[(i - 1) * width + j - 1] as number) + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (d[(i - 2) * width + j - 2] as number) + cost);
      }
      d[i * width + j] = value;
    }
  }
  return d[a.length * width + b.length] as number;
}

/**
 * The closest segment to a mistyped token: a prefix match wins outright,
 * then the lowest normalized Damerau-Levenshtein distance at or under 0.4 —
 * `suggestNames`' ranking MINUS its exact-match exclusion: a case-only
 * stray (`REACT`) scores 0 on the prefix branch and IS suggested here,
 * where pragma's bin-level suggester deliberately stays silent (its
 * `candidateLower === queryLower` skip). Fuzzed over 200k pairs, the
 * case-only class is the ONLY rank divergence between the two.
 * Case-insensitive; `undefined` when nothing is close (or the token is
 * empty).
 */
function closestSegment(
  query: string,
  candidates: readonly string[],
): string | undefined {
  if (query === "") return undefined;
  const queryLower = query.toLowerCase();
  let best: { name: string; score: number } | undefined;
  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();
    const score = candidateLower.startsWith(queryLower)
      ? 0
      : editDistance(queryLower, candidateLower) /
        Math.max(queryLower.length, candidateLower.length);
    if (score <= 0.4 && (best === undefined || score < best.score)) {
      best = { name: candidate, score };
    }
  }
  return best?.name;
}

/**
 * The designed unknown-segment error beneath a namespace. Commander's own
 * handling is host-divergent by construction — pragma's namespaces carry an
 * action, so its `unknownCommand` never fires and the mount used to
 * re-implement the line, while summon got commander's `(Did you mean x?)` —
 * so the wrapper owns this message in BOTH CLIs, in the same
 * `Did you mean '<chain> <segment>'?` shape the excess-positional path
 * already uses, suggesting the closest child segment.
 *
 * @param commandChain - The invoked namespace's full name chain, root (bin
 *   name) first — host-agnostic, so a mounted subtree suggests its real
 *   invocation (`pragma create component react`, not a truncated one).
 * @param stray - The unrecognized segment.
 * @param children - The namespace's child segments.
 * @returns The rendered error text (one or two lines, no trailing newline)
 *   plus the structured facts a host writer may reframe.
 */
function unknownSegmentUsage(
  commandChain: readonly string[],
  stray: string,
  children: readonly string[],
): UsageError {
  const error = `error: unknown command '${stray}'`;
  const suggestion = closestSegment(stray, children);
  return suggestion === undefined
    ? { message: error, detail: { stray, chain: commandChain } }
    : {
        message: `${error}\nDid you mean '${[...commandChain, suggestion].join(" ")}'?`,
        detail: { stray, suggestion, chain: commandChain },
      };
}

/** The rendered text of {@link unknownSegmentUsage} (the tested surface). */
export function unknownSegmentMessage(
  commandChain: readonly string[],
  stray: string,
  children: readonly string[],
): string {
  return unknownSegmentUsage(commandChain, stray, children).message;
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
function configureGeneratorCommand<G extends SurfaceGenerator>(
  cmd: Command,
  entry: CommandEntry<G>,
  barrel: readonly CommandEntry<G>[],
  host: GeneratorCliHost<G>,
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
      const usage = excessArgumentUsage(
        commandChain(cmd),
        stray,
        cmd.args,
        siblings,
        children,
      );
      writeUsageError(host, usage, "excess-positional");
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
 * Configure a namespace (non-runnable) command: the wrapper owns the unknown
 * child segment (the shared did-you-mean, exit 2) and the bare invocation
 * (the namespace's own help on stderr, exit 1 — both hosts' established
 * shape). Excess tolerance makes Commander route an unrecognized first
 * operand to this action instead of its host-divergent `unknownCommand`
 * path; a KNOWN segment still dispatches to the child before the action is
 * consulted, and a runnable entry registered at the same path replaces this
 * action with the leaf's own.
 */
function configureNamespaceCommand<G extends SurfaceGenerator>(
  cmd: Command,
  host: GeneratorCliHost<G>,
): void {
  cmd.allowExcessArguments(true);
  cmd.action(() => {
    const stray = cmd.args[0];
    if (stray !== undefined) {
      const children = cmd.commands.map((child) => child.name());
      writeUsageError(
        host,
        unknownSegmentUsage(commandChain(cmd), stray, children),
        "unknown-segment",
      );
      process.exitCode = 2;
      return;
    }
    // Bare namespace: its own help on stderr, exit 1 — written directly
    // (never through Commander's writers, which a host may silence), and
    // laid out for the stream it goes to: `{ error: true }` selects the
    // ERROR output context (stderr's width), where the bare call would
    // measure stdout's. Byte-identical under pipes (both default to 80).
    process.stderr.write(cmd.helpInformation({ error: true }));
    process.exitCode = 1;
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
export default function registerGeneratorCommands<G extends SurfaceGenerator>(
  rootCmd: Command,
  barrel: readonly CommandEntry<G>[],
  host: GeneratorCliHost<G>,
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

      configureNamespaceCommand(cmd, host);
      host.onNamespace?.(cmd, entry);
      commandMap.set(currentPath, cmd);
    }
  }
}
