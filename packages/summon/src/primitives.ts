/**
 * Primitive Operations
 *
 * This module provides primitive task-returning functions for common operations.
 * These are the building blocks for constructing generators.
 */

import {
  copyDirectoryEffect,
  copyFileEffect,
  deleteDirectoryEffect,
  deleteFileEffect,
  execEffect,
  existsEffect,
  globEffect,
  logEffect,
  makeDirEffect,
  promptEffect,
  readContextEffect,
  readFileEffect,
  writeContextEffect,
  writeFileEffect,
} from "./effect.js";
import { effect, pure } from "./task.js";
import type { ExecResult, LogLevel, PromptQuestion, Task } from "./types.js";

// =============================================================================
// File System Primitives
// =============================================================================

/**
 * Read a file and return its contents as a string.
 */
export const readFile = (path: string): Task<string> =>
  effect(readFileEffect(path));

/**
 * Write content to a file.
 */
export const writeFile = (path: string, content: string): Task<void> =>
  effect(writeFileEffect(path, content));

/**
 * Copy a file from source to destination.
 */
export const copyFile = (source: string, dest: string): Task<void> =>
  effect(copyFileEffect(source, dest));

/**
 * Copy a directory recursively from source to destination.
 */
export const copyDirectory = (source: string, dest: string): Task<void> =>
  effect(copyDirectoryEffect(source, dest));

/**
 * Delete a file.
 */
export const deleteFile = (path: string): Task<void> =>
  effect(deleteFileEffect(path));

/**
 * Delete a directory recursively.
 */
export const deleteDirectory = (path: string): Task<void> =>
  effect(deleteDirectoryEffect(path));

/**
 * Create a directory (recursively by default).
 */
export const mkdir = (path: string, recursive = true): Task<void> =>
  effect(makeDirEffect(path, recursive));

/**
 * Check if a file or directory exists.
 */
export const exists = (path: string): Task<boolean> =>
  effect(existsEffect(path));

/**
 * Find files matching a glob pattern.
 */
export const glob = (pattern: string, cwd: string): Task<string[]> =>
  effect(globEffect(pattern, cwd));

// =============================================================================
// Process Primitives
// =============================================================================

/**
 * Execute a command with arguments.
 */
export const exec = (
  command: string,
  args: string[],
  cwd?: string,
): Task<ExecResult> => effect(execEffect(command, args, cwd));

/**
 * Execute a simple command string (split on spaces).
 */
export const execSimple = (
  commandLine: string,
  cwd?: string,
): Task<ExecResult> => {
  const parts = commandLine.split(" ");
  const [command, ...args] = parts;
  return exec(command, args, cwd);
};

// =============================================================================
// Prompt Primitives
// =============================================================================

/**
 * Prompt the user with a question.
 */
export const prompt = <T = unknown>(question: PromptQuestion): Task<T> =>
  effect(promptEffect(question));

/**
 * Prompt for text input.
 */
export const promptText = (
  name: string,
  message: string,
  defaultValue?: string,
): Task<string> =>
  prompt({
    type: "text",
    name,
    message,
    default: defaultValue,
  });

/**
 * Prompt for confirmation.
 */
export const promptConfirm = (
  name: string,
  message: string,
  defaultValue = false,
): Task<boolean> =>
  prompt({
    type: "confirm",
    name,
    message,
    default: defaultValue,
  });

/**
 * Prompt for selection from a list.
 */
export const promptSelect = (
  name: string,
  message: string,
  choices: Array<{ label: string; value: string }>,
  defaultValue?: string,
): Task<string> =>
  prompt({
    type: "select",
    name,
    message,
    choices,
    default: defaultValue,
  });

/**
 * Prompt for multiple selections from a list.
 */
export const promptMultiselect = (
  name: string,
  message: string,
  choices: Array<{ label: string; value: string }>,
  defaultValue?: string[],
): Task<string[]> =>
  prompt({
    type: "multiselect",
    name,
    message,
    choices,
    default: defaultValue,
  });

// =============================================================================
// Logging Primitives
// =============================================================================

/**
 * Log a message at a specific level.
 */
export const log = (level: LogLevel, message: string): Task<void> =>
  effect(logEffect(level, message));

/**
 * Log a debug message.
 */
export const debug = (message: string): Task<void> => log("debug", message);

/**
 * Log an info message.
 */
export const info = (message: string): Task<void> => log("info", message);

/**
 * Log a warning message.
 */
export const warn = (message: string): Task<void> => log("warn", message);

/**
 * Log an error message.
 */
export const error = (message: string): Task<void> => log("error", message);

// =============================================================================
// Context Primitives
// =============================================================================

/**
 * Read a value from the context.
 */
export const getContext = <T = unknown>(key: string): Task<T | undefined> =>
  effect(readContextEffect(key));

/**
 * Write a value to the context.
 */
export const setContext = (key: string, value: unknown): Task<void> =>
  effect(writeContextEffect(key, value));

/**
 * Execute a task with a temporary context value.
 */
export const withContext = <A>(
  key: string,
  value: unknown,
  task: Task<A>,
): Task<A> => {
  // This is a higher-level pattern that will be handled specially by interpreters
  // For now, we implement it as set -> run -> restore
  return {
    _tag: "Effect",
    effect: writeContextEffect(key, value),
    cont: () => task,
  };
};

// =============================================================================
// Pure Primitives
// =============================================================================

/**
 * A task that does nothing and returns void.
 */
export const noop: Task<void> = pure(undefined);

/**
 * A task that returns the given value.
 */
export const succeed = <A>(value: A): Task<A> => pure(value);
