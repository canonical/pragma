/**
 * Production Interpreter
 *
 * This module implements the production interpreter that actually executes effects.
 * It transforms the pure Task descriptions into real operations.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Effect, ExecResult, Task, TaskError } from "./types.js";

// =============================================================================
// Task Execution Error
// =============================================================================

export class TaskExecutionError extends Error {
  public readonly code: string;
  public readonly taskError: TaskError;

  constructor(error: TaskError) {
    super(error.message);
    this.name = "TaskExecutionError";
    this.code = error.code;
    this.taskError = error;

    if (error.stack) {
      this.stack = error.stack;
    }
  }
}

// =============================================================================
// Effect Executor
// =============================================================================

/**
 * Execute a single effect and return the result.
 * This is where the actual I/O happens.
 */
export const executeEffect = async (
  effect: Effect,
  context: Map<string, unknown>,
  promptHandler?: (question: Effect & { _tag: "Prompt" }) => Promise<unknown>,
  onLog?: (level: "debug" | "info" | "warn" | "error", message: string) => void,
): Promise<unknown> => {
  switch (effect._tag) {
    case "ReadFile": {
      return fs.readFile(effect.path, "utf-8");
    }

    case "WriteFile": {
      const dir = path.dirname(effect.path);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(effect.path, effect.content, "utf-8");
      return undefined;
    }

    case "AppendFile": {
      const dir = path.dirname(effect.path);
      await fs.mkdir(dir, { recursive: true });
      if (effect.createIfMissing) {
        // Create file if it doesn't exist, then append
        try {
          await fs.access(effect.path);
        } catch {
          // File doesn't exist, create it
          await fs.writeFile(effect.path, "", "utf-8");
        }
      }
      await fs.appendFile(effect.path, effect.content, "utf-8");
      return undefined;
    }

    case "CopyFile": {
      const destDir = path.dirname(effect.dest);
      await fs.mkdir(destDir, { recursive: true });
      await fs.copyFile(effect.source, effect.dest);
      return undefined;
    }

    case "CopyDirectory": {
      await fs.cp(effect.source, effect.dest, { recursive: true });
      return undefined;
    }

    case "DeleteFile": {
      await fs.unlink(effect.path);
      return undefined;
    }

    case "DeleteDirectory": {
      await fs.rm(effect.path, { recursive: true, force: true });
      return undefined;
    }

    case "MakeDir": {
      await fs.mkdir(effect.path, { recursive: effect.recursive });
      return undefined;
    }

    case "Exists": {
      try {
        await fs.access(effect.path);
        return true;
      } catch {
        return false;
      }
    }

    case "Glob": {
      // Use Bun's glob if available, otherwise fall back to fs.readdir
      if (typeof Bun !== "undefined" && Bun.Glob) {
        const globber = new Bun.Glob(effect.pattern);
        const matches: string[] = [];
        for await (const file of globber.scan({ cwd: effect.cwd })) {
          matches.push(file);
        }
        return matches;
      }
      // Fallback: simple recursive readdir (limited glob support)
      return simpleGlob(effect.pattern, effect.cwd);
    }

    case "Exec": {
      if (typeof Bun !== "undefined") {
        const proc = Bun.spawn([effect.command, ...effect.args], {
          cwd: effect.cwd,
          stdout: "pipe",
          stderr: "pipe",
        });

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        return { stdout, stderr, exitCode } satisfies ExecResult;
      }

      // Node.js fallback
      const { spawn } = await import("node:child_process");
      return new Promise<ExecResult>((resolve, reject) => {
        const child = spawn(effect.command, effect.args, {
          cwd: effect.cwd,
          shell: false,
        });

        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", (data) => {
          stdout += data.toString();
        });
        child.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("close", (code) => {
          resolve({ stdout, stderr, exitCode: code ?? 0 });
        });
        child.on("error", reject);
      });
    }

    case "Prompt": {
      if (promptHandler) {
        return promptHandler(effect);
      }
      throw new TaskExecutionError({
        code: "NO_PROMPT_HANDLER",
        message: "No prompt handler provided for interactive prompts",
      });
    }

    case "Log": {
      if (onLog) {
        onLog(effect.level, effect.message);
      } else {
        const prefix = {
          debug: "[DEBUG]",
          info: "[INFO]",
          warn: "[WARN]",
          error: "[ERROR]",
        }[effect.level];
        console.log(`${prefix} ${effect.message}`);
      }
      return undefined;
    }

    case "ReadContext": {
      return context.get(effect.key);
    }

    case "WriteContext": {
      context.set(effect.key, effect.value);
      return undefined;
    }

    case "Parallel":
    case "Race":
      // These are handled specially in runTask to preserve options
      throw new Error(
        `${effect._tag} effect must be handled by runTask, not executeEffect directly`,
      );
  }
};

// =============================================================================
// Simple Glob Implementation (fallback)
// =============================================================================

const simpleGlob = async (pattern: string, cwd: string): Promise<string[]> => {
  const results: string[] = [];

  const walk = async (dir: string, prefix: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await walk(fullPath, relativePath);
      } else if (matchesPattern(relativePath, pattern)) {
        results.push(relativePath);
      }
    }
  };

  await walk(cwd, "");
  return results;
};

const matchesPattern = (filepath: string, pattern: string): boolean => {
  // Very simple glob matching - just handles * and **
  const regex = pattern
    .replace(/\*\*/g, "<<GLOBSTAR>>")
    .replace(/\*/g, "[^/]*")
    .replace(/<<GLOBSTAR>>/g, ".*")
    .replace(/\./g, "\\.");
  return new RegExp(`^${regex}$`).test(filepath);
};

// =============================================================================
// Task Runner Options
// =============================================================================

export interface RunTaskOptions {
  /** Context for storing values between effects */
  context?: Map<string, unknown>;
  /** Handler for interactive prompts */
  promptHandler?: (question: Effect & { _tag: "Prompt" }) => Promise<unknown>;
  /** Called before each effect is executed */
  onEffectStart?: (effect: Effect) => void;
  /** Called after each effect completes */
  onEffectComplete?: (effect: Effect, duration: number) => void;
  /** Handler for log effects. If provided, log output goes here instead of console */
  onLog?: (level: "debug" | "info" | "warn" | "error", message: string) => void;
}

// =============================================================================
// Task Runner
// =============================================================================

/**
 * Run a task to completion, executing all effects.
 */
export const runTask = async <A>(
  task: Task<A>,
  options: RunTaskOptions = {},
): Promise<A> => {
  const {
    context = new Map(),
    promptHandler,
    onEffectStart,
    onEffectComplete,
    onLog,
  } = options;

  const runInternal = async <B>(t: Task<B>): Promise<B> => {
    switch (t._tag) {
      case "Pure":
        return t.value;

      case "Fail":
        throw new TaskExecutionError(t.error);

      case "Effect": {
        const effect = t.effect;

        // Handle Parallel and Race effects specially to preserve options
        if (effect._tag === "Parallel") {
          onEffectStart?.(effect);
          const startTime = performance.now();

          const results = await Promise.all(
            effect.tasks.map((task) => runInternal(task)),
          );

          const duration = performance.now() - startTime;
          onEffectComplete?.(effect, duration);

          return runInternal(t.cont(results));
        }

        if (effect._tag === "Race") {
          onEffectStart?.(effect);
          const startTime = performance.now();

          const result = await Promise.race(
            effect.tasks.map((task) => runInternal(task)),
          );

          const duration = performance.now() - startTime;
          onEffectComplete?.(effect, duration);

          return runInternal(t.cont(result));
        }

        // Handle all other effects
        onEffectStart?.(effect);
        const startTime = performance.now();

        const result = await executeEffect(effect, context, promptHandler, onLog);

        const duration = performance.now() - startTime;
        onEffectComplete?.(effect, duration);

        return runInternal(t.cont(result));
      }
    }
  };

  return runInternal(task);
};

/**
 * Run a task with a fresh context (simple API for backward compatibility).
 */
export const run = <A>(
  task: Task<A>,
  promptHandler?: (question: Effect & { _tag: "Prompt" }) => Promise<unknown>,
): Promise<A> => runTask(task, { promptHandler });
