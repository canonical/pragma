/**
 * Production Interpreter
 *
 * This module implements the production interpreter that actually executes effects.
 * It transforms the pure Task descriptions into real operations.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { computeEffectId, formatEffectId } from "./effectId.js";
import type {
  Effect,
  EffectId,
  ExecResult,
  Journal,
  Task,
  TaskError,
} from "./types.js";

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

/**
 * Base class for the failures a {@link Journal} raises. They signal a broken
 * record/replay contract rather than a task-level effect failure, so the
 * interpreter lets them escape recovery instead of routing them to a
 * `recover`/`orElse` handler. Never thrown directly — catch it to handle any
 * journal failure, or a subclass for a specific one.
 */
export abstract class JournalError extends Error {}

/**
 * Raised when a task, replayed against a {@link Journal}, performs an effect
 * whose identity does not match the entry recorded at that position — the
 * task's shape diverged from the recording (a different prompt answer took a
 * different branch, an input changed). Replay fails closed here rather than
 * returning a stale recorded result for a different effect.
 */
export class JournalDivergenceError extends JournalError {
  public readonly position: number;
  public readonly expected: EffectId;
  public readonly actual: EffectId;

  constructor(position: number, expected: EffectId, actual: EffectId) {
    super(
      `Journal divergence at position ${position}: expected ${formatEffectId(
        expected,
      )} but the task performed ${formatEffectId(actual)}`,
    );
    this.name = "JournalDivergenceError";
    this.position = position;
    this.expected = expected;
    this.actual = actual;
  }
}

/**
 * Raised when an effect cannot be journaled: a structural `Parallel`/`Race`
 * (whose concurrent children have no sound positional identity), or an effect
 * whose identity content is not canonicalisable (a `WriteContext` carrying a
 * function, symbol, class instance, or cyclic value). A journal spans sequential
 * tasks; this fails closed rather than record an effect it cannot replay.
 */
export class JournalUnsupportedEffectError extends JournalError {
  public readonly effectTag: Effect["_tag"];

  constructor(effectTag: Effect["_tag"], reason: string) {
    super(`Cannot journal a ${effectTag} effect: ${reason}`);
    this.name = "JournalUnsupportedEffectError";
    this.effectTag = effectTag;
  }
}

/**
 * Raised when a replayed task completes having consumed fewer effects than the
 * journal recorded — the task grew shorter than its recording (a diverged
 * branch, or a single-use `gen` task replayed without being rebuilt). The
 * unconsumed tail signals a divergence, so replay fails closed rather than
 * returning a truncated value.
 */
export class JournalIncompleteError extends JournalError {
  public readonly consumed: number;
  public readonly recorded: number;

  constructor(consumed: number, recorded: number) {
    super(
      `Journal replay consumed ${consumed} of ${recorded} recorded effects: the task is shorter than its recording`,
    );
    this.name = "JournalIncompleteError";
    this.consumed = consumed;
    this.recorded = recorded;
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
  /**
   * Journal to record into and/or replay from. An empty journal records every
   * effect outcome; a populated one replays matching outcomes without I/O and
   * appends anything performed past its recorded end. Mutated in place as the
   * run proceeds.
   */
  journal?: Journal;
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
    journal,
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

  // Perform a single effect for real and return its result. Structural
  // Parallel/Race effects drive their children through a fresh, non-journaled
  // pass — so a journal records the whole composite as one opaque entry rather
  // than interleaving child effects — and every other effect is routed to
  // executeEffect.
  const performRaw = async (effect: Effect): Promise<unknown> => {
    if (effect._tag === "Parallel") {
      onEffectStart?.(effect);
      const startTime = performance.now();

      const settled = await Promise.allSettled(
        effect.tasks.map((child) => drive(child, performRaw)),
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
        effect.tasks.map((child) => drive(child, performRaw)),
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

  // The journaling seam. With a journal present, each effect either replays the
  // outcome recorded at the current position (no I/O) or, once past the recorded
  // prefix, runs for real via performRaw and appends its outcome — so an empty
  // journal records, a full journal replays, and a partial one resumes. A
  // journal spans sequential tasks only: a Parallel/Race, or an effect whose
  // identity is not canonicalisable, fails closed with a
  // JournalUnsupportedEffectError; an effect whose identity disagrees with the
  // recorded entry, with a JournalDivergenceError.
  let cursor = 0;
  const perform: (effect: Effect) => Promise<unknown> =
    journal === undefined
      ? performRaw
      : async (effect: Effect): Promise<unknown> => {
          if (effect._tag === "Parallel" || effect._tag === "Race") {
            throw new JournalUnsupportedEffectError(
              effect._tag,
              "a journal records a linear sequence and cannot key concurrent children by position",
            );
          }

          let id: EffectId;
          try {
            id = computeEffectId(effect, "", cursor);
          } catch {
            // A non-canonicalisable identity (e.g. a WriteContext value that is a
            // function or cyclic) can never be matched on replay — fail closed
            // rather than let it masquerade as a recoverable effect error.
            throw new JournalUnsupportedEffectError(
              effect._tag,
              "its identity content is not canonicalisable",
            );
          }

          const recorded = journal.entries.at(cursor);
          const position = cursor;
          cursor += 1;

          if (recorded) {
            if (formatEffectId(recorded.id) !== formatEffectId(id)) {
              throw new JournalDivergenceError(position, recorded.id, id);
            }
            if (recorded.outcome.ok) {
              // Re-apply an in-memory context write so a later live effect past
              // the recorded prefix (a resume) observes the reconstructed
              // context; the durable side effects of I/O effects already
              // happened on the recorded run.
              if (effect._tag === "WriteContext") {
                context.set(effect.key, effect.value);
              }
              return recorded.outcome.value;
            }
            throw new TaskExecutionError(recorded.outcome.error);
          }

          try {
            const value = await performRaw(effect);
            journal.entries.push({ id, outcome: { ok: true, value } });
            return value;
          } catch (thrown) {
            const raw = normalizeThrownError(thrown);
            // Interruption is not a reproducible effect outcome — leave it
            // unrecorded so a resumed run re-attempts the interrupted effect.
            if (raw.code === "TASK_INTERRUPTED") {
              throw thrown;
            }
            // Journal only the deterministic, serialisable error fields — the
            // raw cause is non-serialisable (a cyclic cause would break
            // serializeJournal) and the stack is non-deterministic. Re-throw the
            // same projection so the recording run's recovery handler observes
            // exactly what a replay will.
            const error: TaskError = { code: raw.code, message: raw.message };
            journal.entries.push({ id, outcome: { ok: false, error } });
            throw new TaskExecutionError(error);
          }
        };

  // The trampoline: drive a task to its final value on an explicit stack of
  // bind/recover frames, so no node type recurses through the host call stack.
  // `performEffect` supplies each leaf effect's result — the raw performer, or
  // the journaling seam wrapping it.
  const drive = async (
    root: Task<unknown>,
    performEffect: (effect: Effect) => Promise<unknown>,
  ): Promise<unknown> => {
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
            result = await performEffect(cur.effect);
          } catch (thrown) {
            // A journal control failure (divergence, an unsupported effect) is a
            // broken record/replay contract, not a recoverable effect failure —
            // it escapes rather than being caught by an enclosing
            // recover/orElse/retry.
            if (thrown instanceof JournalError) {
              throw thrown;
            }
            const taskError = normalizeThrownError(thrown);
            // Interruption is not recoverable: an abort surfaced from a
            // Parallel/Race child (whose own guard fired mid-flight) bypasses
            // recovery, preserving the invariant that a cancelled task cannot
            // be resurrected by an enclosing recover/orElse/retry.
            if (taskError.code === "TASK_INTERRUPTED") {
              throw thrown;
            }
            cur = recoverFrom(taskError);
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

  const result = await drive(task as Task<unknown>, perform);

  // A completed replay must have consumed the whole recorded prefix. Fewer
  // consumed entries means the task grew shorter than its recording (a diverged
  // branch, or a single-use gen task replayed without being rebuilt) — fail
  // closed rather than return a truncated value.
  if (journal !== undefined && cursor < journal.entries.length) {
    throw new JournalIncompleteError(cursor, journal.entries.length);
  }

  return result as A;
};

/**
 * Run a task with a fresh context (simple API).
 */
export const run = <A>(
  task: Task<A>,
  promptHandler?: (question: Effect & { _tag: "Prompt" }) => Promise<unknown>,
): Promise<A> => runTask(task, { promptHandler });
