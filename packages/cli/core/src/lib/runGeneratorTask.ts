/**
 * The single, UI-free execution point for running a generator or setup Task
 * for real.
 *
 * Every binary — pragma's readline wizard, summon's Ink TUI — runs its tasks
 * through here. Interactivity is injected as a `promptHandler`, so this core
 * never imports a UI toolkit; the terminal front-ends own that. Centralising
 * execution here gives every command the same working-directory semantics and
 * a single seam where cross-cutting behavior (progress, interception) can be
 * added without touching the callers.
 */

import { type RunTaskOptions, runTask, type Task } from "@canonical/task";

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
 * Run a Task for real in the given working directory and return its value.
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

  const previousCwd = process.cwd();
  const shouldChdir = cwd !== undefined && cwd !== previousCwd;
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
}
