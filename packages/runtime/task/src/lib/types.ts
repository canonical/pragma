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
  | { _tag: "WriteFile"; path: string; content: string; undo?: Task<void> }
  /** Append content to file */
  | {
      _tag: "AppendFile";
      path: string;
      content: string;
      createIfMissing: boolean;
      undo?: Task<void>;
    }
  /**
   * Read a file, apply a pure transform to its contents, and write it back.
   * The transform must be a pure `(source) => newSource` function with no side
   * effects (it is not run during dry-run). There is no default undo — supply
   * an explicit `undo` task (e.g. the inverse transform) to make it reversible.
   */
  | {
      _tag: "TransformFile";
      path: string;
      transform: (source: string) => string;
      undo?: Task<void>;
    }
  /** Copy a single file */
  | { _tag: "CopyFile"; source: string; dest: string; undo?: Task<void> }
  /** Recursively copy a directory */
  | {
      _tag: "CopyDirectory";
      source: string;
      dest: string;
      undo?: Task<void>;
    }
  /** Delete a file */
  | { _tag: "DeleteFile"; path: string; undo?: Task<void> }
  /** Recursively delete a directory */
  | { _tag: "DeleteDirectory"; path: string; undo?: Task<void> }
  /** Create directory and parents */
  | { _tag: "MakeDir"; path: string; recursive: boolean; undo?: Task<void> }
  /** Check if path exists */
  | { _tag: "Exists"; path: string }
  /** Find files matching glob pattern */
  | { _tag: "Glob"; pattern: string; cwd: string }
  /** Execute shell command */
  | {
      _tag: "Exec";
      command: string;
      args: string[];
      cwd?: string;
      undo?: Task<void>;
    }
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
  | { _tag: "Symlink"; target: string; path: string; undo?: Task<void> }
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
 * - Sequence another task via an internal trampoline node (FlatMap)
 * - Install an error-recovery frame (Recover)
 * - Fail with an error (Fail)
 *
 * Tasks are lazy - they don't execute until interpreted by `runTask` or `dryRun`.
 *
 * The public authoring surface is the three smart constructors `pure` / `effect`
 * / `fail`. `FlatMap` and `Recover` are **internal trampoline nodes**: `flatMap`
 * and `recover` build them as data rather than recursing through continuations,
 * so the interpreter can realise bind and recovery on an explicit continuation
 * stack and stay stack-safe to arbitrary depth. Authors never construct them
 * directly.
 *
 * The monad is parameterised over its leaf effect alphabet `E` (defaulting to
 * {@link Effect}), so the kernel is effect-agnostic; the built-in `Effect` union
 * is one instantiation.
 *
 * @typeParam A - The type of the value this task produces
 * @typeParam E - The leaf effect alphabet (an object with a `_tag` field)
 */
export type Task<A, E = Effect> =
  /** Pure value - computation complete */
  | { _tag: "Pure"; value: A }
  /** Effect with continuation - perform effect, then continue */
  | { _tag: "Effect"; effect: E; cont: (result: unknown) => Task<A, E> }
  /** Failure - computation failed with error */
  | { _tag: "Fail"; error: TaskError }
  /** Internal trampoline bind node (not part of the public authoring API) */
  | {
      _tag: "FlatMap";
      inner: Task<unknown, E>;
      f: (x: unknown) => Task<A, E>;
    }
  /**
   * Internal error-handler node (not part of the public authoring API).
   * Installs an error-recovery frame; the interpreter routes a `Fail` raised
   * while evaluating `inner` to `handler`, realised on the interpreter's
   * handler stack so recovery is stack-safe like bind.
   */
  | {
      _tag: "Recover";
      inner: Task<A, E>;
      handler: (error: TaskError) => Task<A, E>;
    };

// =============================================================================
// Effect Identity
// =============================================================================

/**
 * A stable identity for a single effect occurrence.
 *
 * `kind` and `content` are the content-addressable part — the effect's tag plus
 * a canonical serialisation of its identity-bearing fields (closures excluded).
 * `branch` and `seq` are the positional part — the enclosing parallel/race path
 * and a per-branch occurrence counter — that a journal supplies while walking a
 * task, so that two effects with identical content at different positions stay
 * distinct.
 */
export interface EffectId {
  /** The effect's discriminant tag. */
  kind: Effect["_tag"];
  /** Canonical serialisation of the effect's identity-bearing content. */
  content: string;
  /** Structural path of the enclosing parallel/race branch. */
  branch: string;
  /** Per-branch occurrence counter, disambiguating same-content effects. */
  seq: number;
}

// =============================================================================
// Journal
// =============================================================================

/**
 * The recorded outcome of a single journaled effect: either the value it
 * produced, or the full structured error it raised. Both are replayed verbatim
 * so a recovered failure reproduces the same recovery path — including the
 * error's `cause`, `context`, and `suppressed` — on replay. (A non-serialisable
 * `cause` survives an in-memory replay but degrades through
 * {@link serializeJournal}.)
 */
export type JournalOutcome =
  | { ok: true; value: unknown }
  | { ok: false; error: TaskError };

/**
 * One recorded effect occurrence: its stable {@link EffectId} and the
 * {@link JournalOutcome} to replay at that position.
 */
export interface JournalEntry {
  /** Identity of the effect this entry records. */
  id: EffectId;
  /** The outcome to replay when the same effect recurs at this position. */
  outcome: JournalOutcome;
}

/**
 * An ordered log of effect outcomes captured while running a task. An empty
 * journal records a run; a full journal replays one without any I/O; a partial
 * journal replays its prefix and resumes live execution past the recorded end.
 */
export interface Journal {
  /** Effect outcomes in the order they were performed. */
  entries: JournalEntry[];
}

/**
 * The value a task produced together with the {@link Journal} a run captured or
 * extended — the result of {@link recordTask} and {@link replayTask}.
 *
 * @typeParam A - The task's result type.
 */
export interface JournalRun<A> {
  /** The task's final value. */
  value: A;
  /** The journal captured (record) or extended (resume) by the run. */
  journal: Journal;
}

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
