/**
 * Core type definitions for the Summon code generator framework.
 *
 * This module defines the fundamental types that power the monadic task system:
 * - Effects: Pure data descriptions of operations
 * - Tasks: The Task monad for composable, testable generators
 * - Errors: Structured error handling
 * - Generator definitions: Schema for defining generators
 *
 * @packageDocumentation
 */

// =============================================================================
// Log Levels
// =============================================================================

/**
 * Log levels for the logging primitives.
 *
 * - `debug` - Detailed information, only shown with `--verbose` flag
 * - `info` - General information about generation progress
 * - `warn` - Warning messages for non-fatal issues
 * - `error` - Error messages for failures
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

// =============================================================================
// Prompt Types
// =============================================================================

/**
 * Base interface for all prompt types.
 */
export interface PromptQuestionBase {
  /** Unique identifier for this prompt, used as the answer key */
  name: string;
  /** Question text displayed to the user */
  message: string;
  /** Default value if user provides no input */
  default?: unknown;
}

/**
 * Free-form text input prompt.
 *
 * @example
 * ```typescript
 * { name: "projectName", type: "text", message: "Project name:", default: "my-app" }
 * ```
 *
 * CLI: `--project-name=value`
 */
export interface TextPrompt extends PromptQuestionBase {
  type: "text";
  default?: string;
  /** Validation function, returns true or error message */
  validate?: (value: string) => boolean | string;
}

/**
 * Boolean yes/no confirmation prompt.
 *
 * @example
 * ```typescript
 * { name: "withTests", type: "confirm", message: "Include tests?", default: true }
 * ```
 *
 * CLI: `--with-tests` (enable) or `--no-with-tests` (disable)
 */
export interface ConfirmPrompt extends PromptQuestionBase {
  type: "confirm";
  default?: boolean;
}

/**
 * Single selection from a list of choices.
 *
 * @example
 * ```typescript
 * {
 *   name: "framework",
 *   type: "select",
 *   message: "Framework:",
 *   choices: [
 *     { label: "React", value: "react" },
 *     { label: "Vue", value: "vue" },
 *   ],
 * }
 * ```
 *
 * CLI: `--framework=react`
 */
export interface SelectPrompt extends PromptQuestionBase {
  type: "select";
  /** Available options to choose from */
  choices: Array<{ label: string; value: string }>;
  default?: string;
}

/**
 * Multiple selection from a list of choices.
 *
 * @example
 * ```typescript
 * {
 *   name: "features",
 *   type: "multiselect",
 *   message: "Features:",
 *   choices: [
 *     { label: "TypeScript", value: "ts" },
 *     { label: "ESLint", value: "eslint" },
 *   ],
 * }
 * ```
 *
 * CLI: `--features=ts,eslint`
 */
export interface MultiselectPrompt extends PromptQuestionBase {
  type: "multiselect";
  /** Available options to choose from */
  choices: Array<{ label: string; value: string }>;
  default?: string[];
}

/**
 * Union of all prompt question types.
 */
export type PromptQuestion =
  | TextPrompt
  | ConfirmPrompt
  | SelectPrompt
  | MultiselectPrompt;

// =============================================================================
// Effect Types - Pure data descriptions of operations
// =============================================================================

/**
 * Effect represents a pure data description of a side-effecting operation.
 *
 * Effects are not executed directly - they are data structures that describe
 * what should happen. The interpreter (production or dry-run) decides how
 * to actually execute them.
 *
 * Each effect has a `_tag` discriminator for pattern matching.
 *
 * @example
 * ```typescript
 * // WriteFile effect
 * { _tag: "WriteFile", path: "src/index.ts", content: "export {}" }
 *
 * // Log effect
 * { _tag: "Log", level: "info", message: "Creating file..." }
 * ```
 */
export type Effect =
  /** Read file contents as UTF-8 string */
  | { _tag: "ReadFile"; path: string }
  /** Write content to file, creating parent directories */
  | { _tag: "WriteFile"; path: string; content: string }
  /** Append content to file */
  | {
      _tag: "AppendFile";
      path: string;
      content: string;
      createIfMissing: boolean;
    }
  /** Copy a single file */
  | { _tag: "CopyFile"; source: string; dest: string }
  /** Recursively copy a directory */
  | { _tag: "CopyDirectory"; source: string; dest: string }
  /** Delete a file */
  | { _tag: "DeleteFile"; path: string }
  /** Recursively delete a directory */
  | { _tag: "DeleteDirectory"; path: string }
  /** Create directory and parents */
  | { _tag: "MakeDir"; path: string; recursive: boolean }
  /** Check if path exists */
  | { _tag: "Exists"; path: string }
  /** Find files matching glob pattern */
  | { _tag: "Glob"; pattern: string; cwd: string }
  /** Execute shell command */
  | { _tag: "Exec"; command: string; args: string[]; cwd?: string }
  /** Interactive prompt */
  | { _tag: "Prompt"; question: PromptQuestion }
  /** Log message at specified level */
  | { _tag: "Log"; level: LogLevel; message: string }
  /** Read from task context */
  | { _tag: "ReadContext"; key: string }
  /** Write to task context */
  | { _tag: "WriteContext"; key: string; value: unknown }
  /** Run tasks in parallel */
  | { _tag: "Parallel"; tasks: Task<unknown>[] }
  /** Race tasks, return first to complete */
  | { _tag: "Race"; tasks: Task<unknown>[] };

// =============================================================================
// Task Error
// =============================================================================

/**
 * Structured error type for task failures.
 *
 * @example
 * ```typescript
 * {
 *   code: "FILE_NOT_FOUND",
 *   message: "Cannot read file: src/missing.ts",
 *   context: { path: "src/missing.ts" }
 * }
 * ```
 */
export interface TaskError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Original error that caused this failure */
  cause?: unknown;
  /** Additional context about the error */
  context?: Record<string, unknown>;
  /** Stack trace if available */
  stack?: string;
}

// =============================================================================
// Task Monad - The core abstraction for composable generators
// =============================================================================

/**
 * The Task monad - the core abstraction for composable, testable generators.
 *
 * A Task is a pure description of a computation that may:
 * - Return a value immediately (Pure)
 * - Perform an effect and continue (Effect)
 * - Fail with an error (Fail)
 *
 * Tasks are lazy - they don't execute until interpreted by `runTask` or `dryRun`.
 *
 * @typeParam A - The type of the value this task produces
 *
 * @example
 * ```typescript
 * // Create a task that writes a file
 * const task: Task<void> = writeFile("hello.txt", "Hello, world!");
 *
 * // Compose tasks
 * const composed: Task<void> = sequence_([
 *   mkdir("src"),
 *   writeFile("src/index.ts", "export {}"),
 * ]);
 *
 * // Run for real
 * await runTask(task);
 *
 * // Or dry-run for testing
 * const { effects } = dryRun(task);
 * ```
 */
export type Task<A> =
  /** Pure value - computation complete */
  | { _tag: "Pure"; value: A }
  /** Effect with continuation - perform effect, then continue */
  | { _tag: "Effect"; effect: Effect; cont: (result: unknown) => Task<A> }
  /** Failure - computation failed with error */
  | { _tag: "Fail"; error: TaskError };

// =============================================================================
// Execution Result
// =============================================================================

/**
 * Result of executing a shell command.
 */
export interface ExecResult {
  /** Standard output from the command */
  stdout: string;
  /** Standard error from the command */
  stderr: string;
  /** Exit code (0 = success) */
  exitCode: number;
}

// =============================================================================
// Generator Definition Types
// =============================================================================

/**
 * Metadata for a generator, displayed in CLI help and discovery.
 */
export interface GeneratorMeta {
  /** Generator name, used in CLI path (e.g., "component/react") */
  name: string;
  /** One-line description shown in generator listings */
  description: string;
  /** Semantic version of the generator */
  version: string;
  /** Author name or email */
  author?: string;
  /**
   * Extended help text shown when calling `summon <topic>` (without subgenerator)
   * and in --help. Use this for detailed explanation and examples.
   * Supports markdown-like formatting.
   */
  help?: string;
  /**
   * Usage examples shown in help. Each example should show a common invocation.
   */
  examples?: string[];
}

/**
 * Definition of a prompt in a generator.
 *
 * Each prompt becomes a CLI flag. The prompt name is converted to kebab-case
 * for the flag (e.g., `componentPath` → `--component-path`).
 */
export interface PromptDefinition {
  /** Unique identifier, used as answer key and CLI flag name */
  name: string;
  /** Question text displayed to the user */
  message: string;
  /** Type of input */
  type: "text" | "confirm" | "select" | "multiselect";
  /** Default value if user provides no input */
  default?: unknown;
  /** Choices for select/multiselect prompts */
  choices?: Array<{ label: string; value: string }>;
  /** Conditional function - prompt is skipped if this returns false */
  when?: (answers: Record<string, unknown>) => boolean;
  /** Validation function, returns true or error message */
  validate?: (value: unknown) => boolean | string;
  /**
   * Group name for organizing options in --help output.
   * Options without a group appear under "Options".
   */
  group?: string;
}

/**
 * The complete definition of a generator.
 *
 * A generator has three parts:
 * 1. `meta` - Metadata for CLI display and help
 * 2. `prompts` - Questions to ask the user (become CLI flags)
 * 3. `generate` - Pure function that returns a Task describing what to do
 *
 * @typeParam TAnswers - Type of the answers object passed to generate
 *
 * @example
 * ```typescript
 * const generator = {
 *   meta: { name: "module", description: "Create a module", version: "1.0.0" },
 *   prompts: [{ name: "name", type: "text", message: "Module name:" }],
 *   generate: (answers) => writeFile(`src/${answers.name}.ts`, "export {}"),
 * } as const satisfies GeneratorDefinition<{ name: string }>;
 * ```
 */
export interface GeneratorDefinition<TAnswers = Record<string, unknown>> {
  /** Generator metadata for CLI display */
  meta: GeneratorMeta;
  /** Prompts to collect answers from user */
  prompts: PromptDefinition[];
  /** Pure function that returns a Task describing the generation */
  generate: (answers: TAnswers) => Task<void>;
}

/**
 * A generator definition without type parameters, used in barrels/collections.
 * Generators with any answer type can be assigned to this.
 *
 * Uses `never` for contravariant position - since `generate` takes TAnswers as input,
 * a GeneratorDefinition<SpecificAnswers> can accept Record<string, unknown> which
 * is a supertype of SpecificAnswers.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for contravariant generator collections
export type AnyGenerator = GeneratorDefinition<any>;

// =============================================================================
// Task Event Types (for RxJS integration / progress reporting)
// =============================================================================

export type TaskEvent<A> =
  | { _tag: "Started"; taskId: string; timestamp: number }
  | { _tag: "Progress"; message: string; percent?: number }
  | { _tag: "EffectStarted"; effect: Effect; timestamp: number }
  | { _tag: "EffectCompleted"; effect: Effect; duration: number }
  | { _tag: "Log"; level: LogLevel; message: string }
  | { _tag: "Completed"; value: A; totalDuration: number }
  | { _tag: "Failed"; error: TaskError };

// =============================================================================
// Dry Run Result
// =============================================================================

export interface DryRunResult<A> {
  value: A;
  effects: Effect[];
}

// =============================================================================
// Tracing Types
// =============================================================================

export interface TraceSpan {
  id: string;
  parentId?: string;
  name: string;
  effect?: Effect;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: "pending" | "running" | "completed" | "failed";
  error?: TaskError;
  children: TraceSpan[];
}

export interface TraceResult<A> {
  value: A;
  trace: TraceSpan;
  totalDuration: number;
}
