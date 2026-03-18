/**
 * Core type definitions for the Task effect framework.
 *
 * This module defines the fundamental types that power the monadic task system:
 * - Effects: Pure data descriptions of operations
 * - Tasks: The Task monad for composable, testable operations
 * - Errors: Structured error handling
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
 * - `info` - General information about progress
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
 */
export interface TextPrompt extends PromptQuestionBase {
  type: "text";
  default?: string;
  /** Validation function, returns true or error message */
  validate?: (value: string) => boolean | string;
}

/**
 * Boolean yes/no confirmation prompt.
 */
export interface ConfirmPrompt extends PromptQuestionBase {
  type: "confirm";
  default?: boolean;
}

/**
 * Single selection from a list of choices.
 */
export interface SelectPrompt extends PromptQuestionBase {
  type: "select";
  /** Available options to choose from */
  choices: Array<{ label: string; value: string }>;
  default?: string;
}

/**
 * Multiple selection from a list of choices.
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
  /** Create a symbolic link */
  | { _tag: "Symlink"; target: string; path: string }
  /** Race tasks, return first to complete */
  | { _tag: "Race"; tasks: Task<unknown>[] };

// =============================================================================
// Task Error
// =============================================================================

/**
 * Structured error type for task failures.
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
  /** For parallel failures: all errors, not just the first */
  suppressed?: TaskError[];
}

// =============================================================================
// Base Error Codes
// =============================================================================

/**
 * Base error codes used by the task framework.
 * Domains can extend this with their own codes.
 */
export type BaseErrorCode =
  | "FILE_NOT_FOUND"
  | "EXEC_FAILED"
  | "PROMPT_CANCELLED"
  | "TASK_INTERRUPTED"
  | "INTERNAL";

// =============================================================================
// Task Monad - The core abstraction for composable operations
// =============================================================================

/**
 * The Task monad - the core abstraction for composable, testable operations.
 *
 * A Task is a pure description of a computation that may:
 * - Return a value immediately (Pure)
 * - Perform an effect and continue (Effect)
 * - Fail with an error (Fail)
 *
 * Tasks are lazy - they don't execute until interpreted by `runTask` or `dryRun`.
 *
 * @typeParam A - The type of the value this task produces
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
// Task Event Types (for progress reporting)
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
