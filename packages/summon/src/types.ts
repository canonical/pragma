/**
 * Core type definitions for the Summon code generator framework.
 *
 * This module defines the fundamental types that power the monadic task system:
 * - Effects: Pure data descriptions of operations
 * - Tasks: The Task monad for composable, testable generators
 * - Errors: Structured error handling
 * - Generator definitions: Schema for defining generators
 */

// =============================================================================
// Log Levels
// =============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

// =============================================================================
// Prompt Types
// =============================================================================

export interface PromptQuestionBase {
  name: string;
  message: string;
  default?: unknown;
}

export interface TextPrompt extends PromptQuestionBase {
  type: "text";
  default?: string;
  validate?: (value: string) => boolean | string;
}

export interface ConfirmPrompt extends PromptQuestionBase {
  type: "confirm";
  default?: boolean;
}

export interface SelectPrompt extends PromptQuestionBase {
  type: "select";
  choices: Array<{ label: string; value: string }>;
  default?: string;
}

export interface MultiselectPrompt extends PromptQuestionBase {
  type: "multiselect";
  choices: Array<{ label: string; value: string }>;
  default?: string[];
}

export type PromptQuestion =
  | TextPrompt
  | ConfirmPrompt
  | SelectPrompt
  | MultiselectPrompt;

// =============================================================================
// Effect Types - Pure data descriptions of operations
// =============================================================================

export type Effect =
  | { _tag: "ReadFile"; path: string }
  | { _tag: "WriteFile"; path: string; content: string }
  | { _tag: "AppendFile"; path: string; content: string; createIfMissing: boolean }
  | { _tag: "CopyFile"; source: string; dest: string }
  | { _tag: "CopyDirectory"; source: string; dest: string }
  | { _tag: "DeleteFile"; path: string }
  | { _tag: "DeleteDirectory"; path: string }
  | { _tag: "MakeDir"; path: string; recursive: boolean }
  | { _tag: "Exists"; path: string }
  | { _tag: "Glob"; pattern: string; cwd: string }
  | { _tag: "Exec"; command: string; args: string[]; cwd?: string }
  | { _tag: "Prompt"; question: PromptQuestion }
  | { _tag: "Log"; level: LogLevel; message: string }
  | { _tag: "ReadContext"; key: string }
  | { _tag: "WriteContext"; key: string; value: unknown }
  | { _tag: "Parallel"; tasks: Task<unknown>[] }
  | { _tag: "Race"; tasks: Task<unknown>[] };

// =============================================================================
// Task Error
// =============================================================================

export interface TaskError {
  code: string;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
  stack?: string;
}

// =============================================================================
// Task Monad - The core abstraction for composable generators
// =============================================================================

export type Task<A> =
  | { _tag: "Pure"; value: A }
  | { _tag: "Effect"; effect: Effect; cont: (result: unknown) => Task<A> }
  | { _tag: "Fail"; error: TaskError };

// =============================================================================
// Execution Result
// =============================================================================

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// =============================================================================
// Generator Definition Types
// =============================================================================

export interface GeneratorMeta {
  name: string;
  description: string;
  version: string;
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

export interface PromptDefinition {
  name: string;
  message: string;
  type: "text" | "confirm" | "select" | "multiselect";
  default?: unknown;
  choices?: Array<{ label: string; value: string }>;
  when?: (answers: Record<string, unknown>) => boolean;
  validate?: (value: unknown) => boolean | string;
  /**
   * Group name for organizing options in --help output.
   * Options without a group appear under "Options".
   */
  group?: string;
}

export interface GeneratorDefinition<TAnswers = Record<string, unknown>> {
  meta: GeneratorMeta;
  prompts: PromptDefinition[];
  generate: (answers: TAnswers) => Task<void>;
}

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
