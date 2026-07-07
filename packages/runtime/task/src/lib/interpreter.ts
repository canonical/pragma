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

/**
 * Normalise a value thrown while performing an effect into a structured
 * {@link TaskError}, so a real I/O exception can be routed through the
 * interpreter's recovery channel rather than escaping it. A
 * {@link TaskExecutionError} carries its `taskError` through unchanged; a
 * filesystem `ENOENT` maps to `FILE_NOT_FOUND`; anything else becomes
 * `INTERNAL`, preserving the original throw as `cause`.
 *
 * @param thrown - The value thrown while performing an effect.
 * @returns The equivalent structured task error.
 */
const normalizeThrownError = (thrown: unknown): TaskError => {
  if (thrown instanceof TaskExecutionError) {
    return thrown.taskError;
  }

  const isFileNotFound =
    typeof thrown === "object" &&
    thrown !== null &&
    "code" in thrown &&
    (thrown as { code: unknown }).code === "ENOENT";

  return {
    code: isFileNotFound ? "FILE_NOT_FOUND" : "INTERNAL",
    message: thrown instanceof Error ? thrown.message : String(thrown),
    cause: thrown,
    stack: thrown instanceof Error ? thrown.stack : undefined,
  };
};

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

    case "TransformFile": {
      const original = await fs.readFile(effect.path, "utf-8");
      const next = effect.transform(original);
      if (next !== original) {
        await fs.writeFile(effect.path, next, "utf-8");
      }
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
      try {
        await fs.unlink(effect.path);
      } catch (error) {
        if (
          !(
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "ENOENT"
          )
        ) {
          throw error;
        }
      }
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

    case "Symlink": {
      const dir = path.dirname(effect.path);
      await fs.mkdir(dir, { recursive: true });
      await fs.symlink(effect.target, effect.path);
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
      /* v8 ignore next 7 -- Bun.Glob branch; only reachable under Bun runtime */
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
      /* v8 ignore next 12 -- Bun.spawn branch; only reachable under Bun runtime */
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
  /** AbortSignal for interrupting task execution */
  signal?: AbortSignal;
}

// =============================================================================
// Task Runner
// =============================================================================

/**
 * A frame on the interpreter's explicit continuation stack: either a pending
 * bind (the `f` of a `FlatMap`) or an installed error-recovery handler (the
 * `handler` of a `Recover`).
 */
type Frame =
  | { kind: "bind"; f: (x: unknown) => Task<unknown> }
  | { kind: "recover"; handler: (error: TaskError) => Task<unknown> };

/**
 * Run a task to completion, executing all effects.
 *
 * Bind and recovery are realised on an explicit continuation/handler-frame
 * stack rather than by recursing through the task structure, so arbitrarily
 * long `flatMap`/`gen` chains run in constant call-stack depth.
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
    signal,
  } = options;

  const checkInterrupted = (): void => {
    if (signal?.aborted) {
      throw new TaskExecutionError({
        code: "TASK_INTERRUPTED",
        message: signal.reason
          ? `Task interrupted: ${signal.reason}`
          : "Task interrupted",
      });
    }
  };

  // Perform a single effect and return its result. Structural Parallel/Race
  // effects run their children through a fresh interpreter pass; every other
  // effect is routed to executeEffect.
  const perform = async (effect: Effect): Promise<unknown> => {
    if (effect._tag === "Parallel") {
      onEffectStart?.(effect);
      const startTime = performance.now();

      const settled = await Promise.allSettled(
        effect.tasks.map((child) => interpret(child)),
      );

      const errors: TaskError[] = [];
      const results: unknown[] = [];

      for (const outcome of settled) {
        if (outcome.status === "fulfilled") {
          results.push(outcome.value);
        } else {
          const err = outcome.reason;
          errors.push(
            err instanceof TaskExecutionError
              ? err.taskError
              : { code: "INTERNAL", message: String(err) },
          );
        }
      }

      if (errors.length > 0) {
        const primary = errors[0];
        throw new TaskExecutionError({
          ...primary,
          suppressed: errors.length > 1 ? errors.slice(1) : undefined,
        });
      }

      onEffectComplete?.(effect, performance.now() - startTime);
      return results;
    }

    if (effect._tag === "Race") {
      onEffectStart?.(effect);
      const startTime = performance.now();

      const result = await Promise.race(
        effect.tasks.map((child) => interpret(child)),
      );

      onEffectComplete?.(effect, performance.now() - startTime);
      return result;
    }

    onEffectStart?.(effect);
    const startTime = performance.now();
    const result = await executeEffect(effect, context, promptHandler, onLog);
    onEffectComplete?.(effect, performance.now() - startTime);
    return result;
  };

  // The trampoline: drive a task to its final value on an explicit stack of
  // bind/recover frames, so no node type recurses through the host call stack.
  const interpret = async (root: Task<unknown>): Promise<unknown> => {
    const stack: Frame[] = [];
    let cur: Task<unknown> = root;

    // Unwind to the nearest recovery frame, discarding pending binds. With no
    // recovery frame installed the error escapes as a TaskExecutionError.
    const recoverFrom = (error: TaskError): Task<unknown> => {
      while (stack.length > 0) {
        const frame = stack.pop();
        if (frame?.kind === "recover") {
          return frame.handler(error);
        }
      }
      throw new TaskExecutionError(error);
    };

    for (;;) {
      checkInterrupted();

      switch (cur._tag) {
        case "FlatMap":
          stack.push({ kind: "bind", f: cur.f });
          cur = cur.inner;
          break;

        case "Recover":
          stack.push({ kind: "recover", handler: cur.handler });
          cur = cur.inner;
          break;

        case "Effect": {
          // A raw exception from the effect (e.g. ENOENT from a real read, or a
          // throwing TransformFile transform) is normalised and routed through
          // the recovery channel, so recover/retry/orElse can see real I/O
          // failures — not just explicit Fail nodes.
          let result: unknown;
          try {
            result = await perform(cur.effect);
          } catch (thrown) {
            cur = recoverFrom(normalizeThrownError(thrown));
            break;
          }
          cur = cur.cont(result);
          break;
        }

        case "Pure": {
          // Success: unwind to the next bind frame, discarding recovery frames.
          const value = cur.value;
          let resumed = false;
          while (stack.length > 0) {
            const frame = stack.pop() as Frame;
            if (frame.kind === "bind") {
              cur = frame.f(value);
              resumed = true;
              break;
            }
          }
          if (!resumed) {
            return value;
          }
          break;
        }

        case "Fail":
          // Failure: unwind to the nearest recovery frame, discarding binds.
          cur = recoverFrom(cur.error);
          break;
      }
    }
  };

  return interpret(task as Task<unknown>) as Promise<A>;
};

/**
 * Run a task with a fresh context (simple API).
 */
export const run = <A>(
  task: Task<A>,
  promptHandler?: (question: Effect & { _tag: "Prompt" }) => Promise<unknown>,
): Promise<A> => runTask(task, { promptHandler });
