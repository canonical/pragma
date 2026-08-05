/**
 * Production Interpreter
 *
 * This module implements the production interpreter that actually executes effects.
 * It transforms the pure Task descriptions into real operations.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import driveAsync, { interruptGuard } from "./driveAsync.js";
import { TaskExecutionError } from "./errors.js";
import type { Effect, ExecResult, Task, TaskError } from "./types.js";

export { TaskExecutionError };

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
  cwd?: string,
): Promise<unknown> => {
  // Resolve a fs-effect path against the per-run base: relative paths land under
  // `cwd`, absolute paths are unchanged (path.resolve semantics), and with no
  // `cwd` the path is returned verbatim — so behaviour is identical to before
  // for callers that do not set it.
  const at = (p: string): string => (cwd ? path.resolve(cwd, p) : p);

  switch (effect._tag) {
    case "ReadFile": {
      return fs.readFile(at(effect.path), "utf-8");
    }

    case "WriteFile": {
      const target = at(effect.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, effect.content, "utf-8");
      return undefined;
    }

    case "AppendFile": {
      const target = at(effect.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      if (effect.createIfMissing) {
        // Create file if it doesn't exist, then append
        try {
          await fs.access(target);
        } catch {
          // File doesn't exist, create it
          await fs.writeFile(target, "", "utf-8");
        }
      }
      await fs.appendFile(target, effect.content, "utf-8");
      return undefined;
    }

    case "TransformFile": {
      const target = at(effect.path);
      const original = await fs.readFile(target, "utf-8");
      const next = effect.transform(original);
      if (next !== original) {
        await fs.writeFile(target, next, "utf-8");
      }
      return undefined;
    }

    case "CopyFile": {
      const dest = at(effect.dest);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(at(effect.source), dest);
      return undefined;
    }

    case "CopyDirectory": {
      await fs.cp(at(effect.source), at(effect.dest), { recursive: true });
      return undefined;
    }

    case "DeleteFile": {
      try {
        await fs.unlink(at(effect.path));
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
      if (effect.onlyIfEmpty) {
        try {
          await fs.rmdir(at(effect.path));
        } catch (error) {
          // Missing (ENOENT), non-empty (ENOTEMPTY, or EEXIST/EBUSY on some
          // platforms) directories are left alone: this variant only cleans
          // up directories the task itself emptied.
          if (
            !(
              error &&
              typeof error === "object" &&
              "code" in error &&
              (error.code === "ENOENT" ||
                error.code === "ENOTEMPTY" ||
                error.code === "EEXIST" ||
                error.code === "EBUSY")
            )
          ) {
            throw error;
          }
        }
        return undefined;
      }
      await fs.rm(at(effect.path), { recursive: true, force: true });
      return undefined;
    }

    case "MakeDir": {
      await fs.mkdir(at(effect.path), { recursive: effect.recursive });
      return undefined;
    }

    case "Symlink": {
      // The link location resolves under `cwd`; the target is left verbatim (a
      // relative symlink target is relative to the link's own directory).
      const linkPath = at(effect.path);
      await fs.mkdir(path.dirname(linkPath), { recursive: true });
      await fs.symlink(effect.target, linkPath);
      return undefined;
    }

    case "Exists": {
      try {
        await fs.access(at(effect.path));
        return true;
      } catch {
        return false;
      }
    }

    case "Glob": {
      const globCwd = at(effect.cwd);
      /* v8 ignore next 7 -- Bun.Glob branch; only reachable under Bun runtime */
      if (typeof Bun !== "undefined" && Bun.Glob) {
        const globber = new Bun.Glob(effect.pattern);
        const matches: string[] = [];
        for await (const file of globber.scan({ cwd: globCwd })) {
          matches.push(file);
        }
        return matches;
      }
      // Fallback: simple recursive readdir (limited glob support)
      return simpleGlob(effect.pattern, globCwd);
    }

    case "Exec": {
      // A relative exec cwd resolves under the per-run base too, so e.g. an
      // install step runs in the created project dir, not the server's cwd.
      // `Exec.cwd` is optional — leave it undefined (spawn's own default) when unset.
      const execCwd = effect.cwd === undefined ? undefined : at(effect.cwd);
      /* v8 ignore next 12 -- Bun.spawn branch; only reachable under Bun runtime */
      if (typeof Bun !== "undefined") {
        const proc = Bun.spawn([effect.command, ...effect.args], {
          cwd: execCwd,
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
          cwd: execCwd,
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
  /**
   * Base directory RELATIVE fs-effect paths resolve against (via
   * `path.resolve(cwd, effect.path)`). Absolute effect paths are unchanged, and
   * when `cwd` is omitted every path is used verbatim — so this is a no-op for
   * existing callers and node's default `process.cwd()` resolution still applies.
   * Set it to pin a per-call write root (e.g. pragma's create/setup verbs thread
   * the SEC-2 jail root here, so the dir the jail validated is the dir written).
   */
  cwd?: string;
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
 * Run a task to completion, executing all effects.
 *
 * Bind and recovery are realised by the shared {@link driveAsync} trampoline on
 * an explicit continuation/handler-frame stack rather than by recursing through
 * the task structure, so arbitrarily long `flatMap`/`gen` chains run in constant
 * call-stack depth. This module now supplies only the *performer* — what an
 * effect actually does — which is the one thing that differs between running a
 * task and planning it.
 */
export const runTask = async <A>(
  task: Task<A>,
  options: RunTaskOptions = {},
): Promise<A> => {
  const {
    context = new Map(),
    cwd,
    promptHandler,
    onEffectStart,
    onEffectComplete,
    onLog,
    signal,
  } = options;

  const checkInterrupted = interruptGuard(signal);

  // Perform a single effect for real and return its result. Structural
  // Parallel/Race effects drive their children through a fresh pass, and every
  // other effect is routed to executeEffect.
  const performRaw = async (effect: Effect): Promise<unknown> => {
    if (effect._tag === "Parallel") {
      onEffectStart?.(effect);
      const startTime = performance.now();

      const settled = await Promise.allSettled(
        effect.tasks.map((child) =>
          driveAsync(child, performRaw, checkInterrupted),
        ),
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
        effect.tasks.map((child) =>
          driveAsync(child, performRaw, checkInterrupted),
        ),
      );

      onEffectComplete?.(effect, performance.now() - startTime);
      return result;
    }

    onEffectStart?.(effect);
    const startTime = performance.now();
    const result = await executeEffect(
      effect,
      context,
      promptHandler,
      onLog,
      cwd,
    );
    onEffectComplete?.(effect, performance.now() - startTime);
    return result;
  };

  return driveAsync(task, performRaw, checkInterrupted);
};

/**
 * Run a task with a fresh context (simple API).
 */
export const run = <A>(
  task: Task<A>,
  promptHandler?: (question: Effect & { _tag: "Prompt" }) => Promise<unknown>,
): Promise<A> => runTask(task, { promptHandler });
