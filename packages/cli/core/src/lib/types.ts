/**
 * Core type definitions for the shared CLI framework.
 *
 * Defines the universal command unit (CommandDefinition), parameter shapes,
 * result variants, output rendering contracts, and completion types used
 * by both pragma and summon CLI binaries.
 *
 * @packageDocumentation
 */

import type { Effect } from "@canonical/task";

// =============================================================================
// Command Context
// =============================================================================

/**
 * Runtime context passed to command execute functions and completion handlers.
 */
export interface CommandContext {
  /** Current working directory */
  readonly cwd: string;
  /** Global flags parsed from the CLI invocation */
  readonly globalFlags: GlobalFlags;
  /**
   * Optional factory for an interactive prompt session. When a generator needs
   * answers on an interactive terminal, the executor opens one of these to ask
   * the user, then executes with the collected answers. cli-core never
   * constructs a session itself — the binary injects the readline/Ink
   * implementation here, keeping the core UI-free.
   */
  readonly promptSession?: PromptSessionFactory | undefined;
}

// =============================================================================
// Prompt Session
// =============================================================================

/**
 * A prompt-answering session: the `promptHandler` seam a terminal front-end
 * injects into the executor, plus its lifecycle. One session spans a whole
 * command run (`create → answer* → dispose`), so buffered piped answers survive
 * across questions.
 */
export interface PromptSession {
  /** Resolve a `Prompt` effect — ask the user, or fall back to a default. */
  readonly answerPrompt: (
    effect: Effect & { _tag: "Prompt" },
  ) => Promise<unknown>;
  /** Whether the user interrupted a prompt (Ctrl-C) — the run must abort. */
  readonly wasInterrupted: () => boolean;
  /** Release any underlying resources. Safe to call more than once. */
  readonly dispose: () => void;
}

/**
 * Factory the caller injects so the executor can open a {@link PromptSession}
 * on demand, exactly once per interactive run.
 */
export type PromptSessionFactory = () => PromptSession;

/**
 * Global flags available on every command.
 */
export interface GlobalFlags {
  /** Condensed Markdown output for LLM consumption */
  readonly llm: boolean;
  /** JSON output format */
  readonly format: "text" | "json";
  /** Diagnostic output to stderr */
  readonly verbose: boolean;
}

// =============================================================================
// Parameter Definition
// =============================================================================

/**
 * Definition of a single command parameter (flag or positional argument).
 *
 * Each parameter becomes a CLI flag. The name is converted to kebab-case
 * for the flag (e.g., `allTiers` → `--all-tiers`).
 */
export interface ParameterDefinition {
  /** Unique identifier, used as the parsed value key and flag name */
  readonly name: string;
  /** One-line description shown in help text */
  readonly description: string;
  /** Input type determining CLI flag behavior */
  readonly type: "string" | "boolean" | "select" | "multiselect";
  /** Available choices for select/multiselect parameters */
  readonly choices?: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
  }>;
  /** Default value when the flag is not provided */
  readonly default?: unknown;
  /** If true, this parameter can be a positional argument (one per command) */
  readonly positional?: boolean;
  /** If true, this parameter must be provided */
  readonly required?: boolean;
  /** Single-character shorthand flag (e.g., "f" for `-f, --follow`) */
  readonly short?: string;
  /**
   * Dynamic completion function for argument-level tab completion.
   * Returns candidate strings matching the partial input.
   */
  readonly complete?: (
    partial: string,
    ctx: CommandContext,
  ) => Promise<string[]>;
}

// =============================================================================
// Render Pair
// =============================================================================

/**
 * A pair of rendering functions for producing output in different modes.
 *
 * Plain mode renders to a string for terminal output.
 * Ink mode (optional) renders to a React element for interactive TUI.
 *
 * @typeParam T - The data type being rendered
 */
export interface RenderPair<T> {
  /** Render data as a plain text string for terminal output */
  readonly plain: (data: T) => string;
  /**
   * Render data as an Ink (React) element for interactive TUI.
   * Optional — when absent, plain mode is used.
   */
  readonly ink?: ((data: T) => unknown) | undefined;
}

// =============================================================================
// Command Result
// =============================================================================

/**
 * The result type for command execution.
 *
 * - `output`: Data to display via a RenderPair (plain or ink mode)
 * - `exit`: No output, just exit with a code
 *
 * Interactive prompting is no longer a result variant: the executor drives the
 * wizard in place through an injected {@link PromptSession} and returns the
 * resulting `output`/`exit` directly.
 */
export type CommandResult = CommandOutputResult | CommandExitResult;

/** Data to render via a RenderPair */
export interface CommandOutputResult {
  readonly tag: "output";
  readonly value: unknown;
  // biome-ignore lint/suspicious/noExplicitAny: RenderPair accepts any data shape from execute
  readonly render: RenderPair<any>;
  /**
   * Process exit code to set after rendering. Defaults to 0 (success). Set to
   * a non-zero value for results that must still render human-readable output
   * (e.g. an all-not-found lookup that prints its errors inline) yet signal
   * failure to callers via the exit code.
   */
  readonly exitCode?: number;
}

/** Exit with code, no output */
export interface CommandExitResult {
  readonly tag: "exit";
  readonly code: number;
}

// =============================================================================
// Command Definition
// =============================================================================

/**
 * The universal command unit — a pure data description of a CLI command.
 *
 * Each domain (component, standard, config, etc.) exports `CommandDefinition[]`.
 * The root CLI concatenates them and calls `registerAll` to wire into Commander.
 *
 * Path-based nesting: `["component", "list"]` becomes `pragma component list`.
 */
export interface CommandDefinition {
  /** Path segments defining the command hierarchy (e.g., ["component", "list"]) */
  readonly path: readonly string[];
  /** One-line description shown in help text */
  readonly description: string;
  /** Parameter definitions for this command */
  readonly parameters: readonly ParameterDefinition[];
  /** Execute the command with parsed parameters and runtime context */
  readonly execute: (
    params: Record<string, unknown>,
    ctx: CommandContext,
  ) => Promise<CommandResult>;
  /** Optional metadata for help rendering and introspection */
  readonly meta?: CommandMeta;
  /** Named groups for organizing parameters in help output */
  readonly parameterGroups?: Readonly<Record<string, readonly string[]>>;
}

/**
 * Optional metadata attached to a command definition.
 */
export interface CommandMeta {
  /** Semantic version of the command */
  readonly version?: string;
  /** Usage examples shown in help text */
  readonly examples?: readonly string[];
  /** Extended help text shown below the description */
  readonly extendedHelp?: string;
  /** Origin package for attribution (e.g., "@canonical/summon-component") */
  readonly origin?: string;
}

// =============================================================================
// Result Dispatch
// =============================================================================

/**
 * Options controlling how command results are dispatched to output.
 *
 * When `mode` is `"ink"` and a result provides an ink renderer,
 * the `renderInk` callback is invoked with the React element.
 * Otherwise, the plain text renderer is used.
 */
export interface HandleResultOptions {
  /** Current rendering mode — determines whether to use ink or plain */
  readonly mode: RenderMode;
  /**
   * Callback that renders a React element via Ink.
   * Only called when mode is "ink" and the result has an ink renderer.
   *
   * @note Impure — renders to process.stdout via Ink.
   */
  readonly renderInk?: (element: unknown) => Promise<void>;
}

// =============================================================================
// Output Adapter
// =============================================================================

/**
 * Rendering mode for output.
 *
 * - `plain`: Terminal text output via stdout
 * - `ink`: React TUI rendering via Ink, activated when stdout is a TTY
 */
export type RenderMode = "plain" | "ink";

/**
 * Adapter that renders command output in the appropriate mode.
 */
export interface OutputAdapter {
  /** Current rendering mode */
  readonly mode: RenderMode;
  /** Render data using the provided render pair */
  render<T>(data: T, renderers: RenderPair<T>): void;
}

// =============================================================================
// Completion Types
// =============================================================================

/**
 * A completion function that returns candidates for a partial input.
 */
export type Completer = (
  partial: string,
  ctx: CommandContext,
) => Promise<string[]>;

/**
 * Tree structure mapping command path segments to completers.
 *
 * Level 1 keys are nouns, level 2 keys are verbs.
 */
export interface CompletionTree {
  /** Noun-level entries: maps noun name to verb map */
  readonly nouns: ReadonlyMap<string, VerbCompletions>;
}

/**
 * Verb-level completion entries for a given noun.
 */
export interface VerbCompletions {
  /** Maps verb name to argument completers */
  readonly verbs: ReadonlyMap<string, ArgCompleters>;
}

/**
 * Argument-level completers for a specific command (noun + verb).
 */
export interface ArgCompleters {
  /** Ordered list of completers for positional and flag arguments */
  readonly completers: readonly Completer[];
  /** Long flag names in `--kebab-case` form, offered once the word starts with `-`. */
  readonly flags: readonly string[];
}

/**
 * Result of resolving a partial input against the completion tree.
 */
export interface CompletionResult {
  /** The completer to invoke, or undefined if no match */
  readonly completer: Completer | undefined;
  /** The partial string to pass to the completer */
  readonly partial: string;
  /** The resolution level (1=noun, 2=verb, 3=argument) */
  readonly level: 1 | 2 | 3;
}
