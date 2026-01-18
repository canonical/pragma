/**
 * Effect Constructors
 *
 * This module provides constructor functions for creating Effect values.
 * Effects are pure data that describe operations without performing them.
 */

import type { Effect, LogLevel, PromptQuestion, Task } from "./types.js";

// =============================================================================
// File System Effect Constructors
// =============================================================================

export const readFileEffect = (path: string): Effect => ({
  _tag: "ReadFile",
  path,
});

export const writeFileEffect = (path: string, content: string): Effect => ({
  _tag: "WriteFile",
  path,
  content,
});

export const copyFileEffect = (source: string, dest: string): Effect => ({
  _tag: "CopyFile",
  source,
  dest,
});

export const copyDirectoryEffect = (source: string, dest: string): Effect => ({
  _tag: "CopyDirectory",
  source,
  dest,
});

export const deleteFileEffect = (path: string): Effect => ({
  _tag: "DeleteFile",
  path,
});

export const deleteDirectoryEffect = (path: string): Effect => ({
  _tag: "DeleteDirectory",
  path,
});

export const makeDirEffect = (path: string, recursive = true): Effect => ({
  _tag: "MakeDir",
  path,
  recursive,
});

export const existsEffect = (path: string): Effect => ({
  _tag: "Exists",
  path,
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
): Effect => ({
  _tag: "Exec",
  command,
  args,
  cwd,
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
    case "CopyFile":
      return `Copy file: ${effect.source} → ${effect.dest}`;
    case "CopyDirectory":
      return `Copy directory: ${effect.source} → ${effect.dest}`;
    case "DeleteFile":
      return `Delete file: ${effect.path}`;
    case "DeleteDirectory":
      return `Delete directory: ${effect.path}`;
    case "MakeDir":
      return `Create directory: ${effect.path}${effect.recursive ? " (recursive)" : ""}`;
    case "Exists":
      return `Check exists: ${effect.path}`;
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
    case "CopyFile":
    case "CopyDirectory":
    case "DeleteFile":
    case "DeleteDirectory":
    case "MakeDir":
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
    case "DeleteFile":
    case "MakeDir":
    case "Exists":
      return [effect.path];
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
