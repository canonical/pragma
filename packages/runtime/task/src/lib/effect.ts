/**
 * Effect Constructors
 *
 * This module provides constructor functions for creating Effect values.
 * Effects are pure data that describe operations without performing them.
 */

import type { Effect, LogLevel, PromptQuestion, Task } from "./types.js";

// =============================================================================
// Undo Options
// =============================================================================

/**
 * Options for attaching an undo task to an effect.
 *
 * - `Task<void>`: custom undo task to execute when reversing this effect
 * - `null`: explicitly disable the default undo for this effect
 * - `undefined` / omitted: use the default undo (if one exists for this effect type)
 */
export interface UndoOptions {
  undo?: Task<void> | null;
}

/**
 * Resolve an undo option against a default.
 * - explicit Task → use it
 * - null → no undo (disabled)
 * - undefined → use the default
 */
const resolveUndo = (
  option: Task<void> | null | undefined,
  defaultUndo: Task<void> | undefined,
): Task<void> | undefined => {
  if (option === null) return undefined;
  if (option !== undefined) return option;
  return defaultUndo;
};

/**
 * Build a bare Task<void> from an effect, without importing from task.ts.
 * Used to construct default undo tasks and avoid circular imports.
 */
const bareTask = (eff: Effect): Task<void> => ({
  _tag: "Effect",
  effect: eff,
  cont: () => ({ _tag: "Pure", value: undefined }),
});

// =============================================================================
// File System Effect Constructors
// =============================================================================

export const readFileEffect = (path: string): Effect => ({
  _tag: "ReadFile",
  path,
});

export const writeFileEffect = (
  path: string,
  content: string,
  opts?: UndoOptions,
): Effect => ({
  _tag: "WriteFile",
  path,
  content,
  undo: resolveUndo(
    opts?.undo,
    bareTask({ _tag: "DeleteFile", path }),
  ),
});

export const appendFileEffect = (
  path: string,
  content: string,
  createIfMissing = true,
  opts?: UndoOptions,
): Effect => ({
  _tag: "AppendFile",
  path,
  content,
  createIfMissing,
  undo: resolveUndo(opts?.undo, undefined),
});

export const copyFileEffect = (
  source: string,
  dest: string,
  opts?: UndoOptions,
): Effect => ({
  _tag: "CopyFile",
  source,
  dest,
  undo: resolveUndo(
    opts?.undo,
    bareTask({ _tag: "DeleteFile", path: dest }),
  ),
});

export const copyDirectoryEffect = (
  source: string,
  dest: string,
  opts?: UndoOptions,
): Effect => ({
  _tag: "CopyDirectory",
  source,
  dest,
  undo: resolveUndo(
    opts?.undo,
    bareTask({ _tag: "DeleteDirectory", path: dest }),
  ),
});

export const deleteFileEffect = (
  path: string,
  opts?: UndoOptions,
): Effect => ({
  _tag: "DeleteFile",
  path,
  undo: resolveUndo(opts?.undo, undefined),
});

export const deleteDirectoryEffect = (
  path: string,
  opts?: UndoOptions,
): Effect => ({
  _tag: "DeleteDirectory",
  path,
  undo: resolveUndo(opts?.undo, undefined),
});

export const makeDirEffect = (
  path: string,
  recursive = true,
  opts?: UndoOptions,
): Effect => ({
  _tag: "MakeDir",
  path,
  recursive,
  undo: resolveUndo(
    opts?.undo,
    bareTask({ _tag: "DeleteDirectory", path }),
  ),
});

export const existsEffect = (path: string): Effect => ({
  _tag: "Exists",
  path,
});

export const symlinkEffect = (
  target: string,
  path: string,
  opts?: UndoOptions,
): Effect => ({
  _tag: "Symlink",
  target,
  path,
  undo: resolveUndo(
    opts?.undo,
    bareTask({ _tag: "DeleteFile", path }),
  ),
});

export const globEffect = (pattern: string, cwd: string): Effect => ({
  _tag: "Glob",
  pattern,
  cwd,
});

// =============================================================================
// Process Effect Constructors
// =============================================================================

export const execEffect = (
  command: string,
  args: string[],
  cwd?: string,
  opts?: UndoOptions,
): Effect => ({
  _tag: "Exec",
  command,
  args,
  cwd,
  undo: resolveUndo(opts?.undo, undefined),
});

// =============================================================================
// Prompt Effect Constructors
// =============================================================================

export const promptEffect = (question: PromptQuestion): Effect => ({
  _tag: "Prompt",
  question,
});

// =============================================================================
// Logging Effect Constructors
// =============================================================================

export const logEffect = (level: LogLevel, message: string): Effect => ({
  _tag: "Log",
  level,
  message,
});

// =============================================================================
// Context Effect Constructors
// =============================================================================

export const readContextEffect = (key: string): Effect => ({
  _tag: "ReadContext",
  key,
});

export const writeContextEffect = (key: string, value: unknown): Effect => ({
  _tag: "WriteContext",
  key,
  value,
});

// =============================================================================
// Concurrency Effect Constructors
// =============================================================================

export const parallelEffect = (tasks: Task<unknown>[]): Effect => ({
  _tag: "Parallel",
  tasks,
});

export const raceEffect = (tasks: Task<unknown>[]): Effect => ({
  _tag: "Race",
  tasks,
});

// =============================================================================
// Effect Utilities
// =============================================================================

/**
 * Get a human-readable description of an effect.
 */
export const describeEffect = (effect: Effect): string => {
  switch (effect._tag) {
    case "ReadFile":
      return `Read file: ${effect.path}`;
    case "WriteFile":
      return `Write file: ${effect.path} (${effect.content.length} bytes)`;
    case "AppendFile":
      return `Append to file: ${effect.path} (${effect.content.length} bytes)${effect.createIfMissing ? " [create if missing]" : ""}`;
    case "CopyFile":
      return `Copy file: ${effect.source} → ${effect.dest}`;
    case "CopyDirectory":
      return `Copy directory: ${effect.source} → ${effect.dest}`;
    case "DeleteFile":
      return `Delete file: ${effect.path}`;
    case "DeleteDirectory":
      return `Delete directory: ${effect.path}`;
    case "MakeDir":
      return `Created ${effect.path}/`;
    case "Exists":
      return `Check exists: ${effect.path}`;
    case "Symlink":
      return `Symlink: ${effect.path} → ${effect.target}`;
    case "Glob":
      return `Glob: ${effect.pattern} in ${effect.cwd}`;
    case "Exec":
      return `Execute: ${effect.command} ${effect.args.join(" ")}`;
    case "Prompt":
      return `Prompt: ${effect.question.message}`;
    case "Log":
      return `Log [${effect.level}]: ${effect.message}`;
    case "ReadContext":
      return `Read context: ${effect.key}`;
    case "WriteContext":
      return `Write context: ${effect.key}`;
    case "Parallel":
      return `Parallel: ${effect.tasks.length} tasks`;
    case "Race":
      return `Race: ${effect.tasks.length} tasks`;
  }
};

/**
 * Check if an effect modifies the file system.
 */
export const isWriteEffect = (effect: Effect): boolean => {
  switch (effect._tag) {
    case "WriteFile":
    case "AppendFile":
    case "CopyFile":
    case "CopyDirectory":
    case "DeleteFile":
    case "DeleteDirectory":
    case "MakeDir":
    case "Symlink":
      return true;
    default:
      return false;
  }
};

/**
 * Get the file paths affected by an effect.
 */
export const getAffectedPaths = (effect: Effect): string[] => {
  switch (effect._tag) {
    case "ReadFile":
    case "WriteFile":
    case "AppendFile":
    case "DeleteFile":
    case "MakeDir":
    case "Exists":
      return [effect.path];
    case "Symlink":
      return [effect.target, effect.path];
    case "CopyFile":
    case "CopyDirectory":
      return [effect.source, effect.dest];
    case "DeleteDirectory":
      return [effect.path];
    case "Glob":
      return [effect.cwd];
    default:
      return [];
  }
};
