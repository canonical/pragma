/**
 * The single, UI-free execution point for running a generator or setup Task
 * for real.
 *
 * Every binary — pragma's kernel, summon's Ink TUI — runs its tasks through
 * here. Interactivity is injected as a `promptHandler`, so this core never
 * imports a UI toolkit; the terminal front-ends own that. Centralising
 * execution here gives every command the same working-directory semantics and
 * a single seam where cross-cutting behavior (progress, interception) can be
 * added without touching the callers.
 *
 * Moved into summon-core (from the v1 cli-core) so it sits below both the
 * summon bin and the pragma kernel — the shared seam the byte-equality
 * guarantee rests on. cli-core re-exports it while it is retired.
 */

import type { Task } from "@canonical/task";
import { type RunTaskOptions, runTask } from "@canonical/task/node";

/** Options controlling how {@link runGeneratorTask} executes a task. */
export interface RunGeneratorTaskOptions {
  /**
   * Directory to run the task in. When set and different from the current
   * process directory, the process is `chdir`-ed for the duration of the run
   * and restored afterwards, so effects resolve relative paths against it.
   */
  readonly cwd?: string;
  /** Handler for interactive `Prompt` effects; the UI seam the front-ends inject. */
  readonly promptHandler?: RunTaskOptions["promptHandler"];
  /** Handler for `Log` effects; where task log output is routed. */
  readonly onLog?: RunTaskOptions["onLog"];
  /** Called before each effect is executed. */
  readonly onEffectStart?: RunTaskOptions["onEffectStart"];
  /** Called after each effect completes. */
  readonly onEffectComplete?: RunTaskOptions["onEffectComplete"];
  /** AbortSignal for interrupting execution. */
  readonly signal?: AbortSignal;
}

/**
 * The tail of the queue serialising runs that request a working directory.
 * `process.cwd()` is process-global state, so two concurrent runs with
 * different `cwd` values would race — one could execute its effects in the
 * other's directory, or restore the wrong one. Chaining every cwd-requesting
 * run onto this promise makes them run one at a time; a failed run must not
 * poison the queue, so the stored tail swallows the rejection (the caller
 * still receives it).
 */
let cwdQueue: Promise<unknown> = Promise.resolve();

/**
 * Run a Task for real in the given working directory and return its value.
 *
 * Runs that request a `cwd` are serialised against each other, so concurrent
 * callers cannot interleave `chdir` calls; runs without a `cwd` execute
 * immediately in whatever the current process directory is.
 *
 * @typeParam A - The task's result type.
 * @param task - A freshly-built task to run.
 * @param options - Working directory and injected handlers.
 * @returns The task's value.
 * @note Impure — performs the task's effects and may `chdir`.
 */
export default async function runGeneratorTask<A>(
  task: Task<A>,
  options: RunGeneratorTaskOptions = {},
): Promise<A> {
  const { cwd, ...runOptions } = options;

  if (cwd === undefined) {
    return runTask(task, runOptions);
  }

  const run = cwdQueue.then(async () => {
    const previousCwd = process.cwd();
    const shouldChdir = cwd !== previousCwd;
    if (shouldChdir) {
      process.chdir(cwd);
    }
    try {
      return await runTask(task, runOptions);
    } finally {
      if (shouldChdir) {
        process.chdir(previousCwd);
      }
    }
  });
  cwdQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
