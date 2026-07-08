/**
 * The single, Ink-free execution point for running a generator or setup Task
 * for real.
 *
 * Every binary — pragma's readline wizard, summon's Ink TUI — runs its tasks
 * through here. Interactivity is injected as a `promptHandler`, so this core
 * never imports a UI toolkit; the terminal front-ends own that. Execution is
 * journaled by default: a fresh run records every effect outcome (via
 * {@link recordTask}) and returns the {@link Journal} alongside the value, so a
 * completed run is a replayable artifact; passing a prior journal replays it
 * (via {@link replayTask}), reproducing recorded outcomes with no I/O and
 * resuming any effects performed past the recorded end.
 *
 * The task must be journal-safe — a sequential task whose effect results survive
 * JSON persistence. A `Parallel`/`Race` effect, or a non-serialisable effect
 * result, fails closed with a `JournalUnsupportedEffectError` rather than record
 * a run it could not replay.
 */

import {
  type Journal,
  type JournalRun,
  type RunTaskOptions,
  recordTask,
  replayTask,
  type Task,
} from "@canonical/task";

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
  /**
   * A journal recorded by a prior run. When set, the task replays against it —
   * reproducing recorded outcomes without I/O and resuming past the recorded
   * end. When omitted, the run records into a fresh journal.
   */
  readonly journal?: Journal;
}

/**
 * Run a Task for real, recording (or replaying) its effects, and return both the
 * value and the journal.
 *
 * @typeParam A - The task's result type.
 * @param task - A freshly-built, journal-safe task to run.
 * @param options - Working directory, injected handlers, and an optional journal
 * to replay from.
 * @returns The task's value and the journal captured (record) or extended (resume).
 * @note Impure — performs the task's effects (or replays them) and may `chdir`.
 */
export default async function runGeneratorTask<A>(
  task: Task<A>,
  options: RunGeneratorTaskOptions = {},
): Promise<JournalRun<A>> {
  const { cwd, journal } = options;
  const runOptions: RunTaskOptions = {
    promptHandler: options.promptHandler,
    onLog: options.onLog,
    onEffectStart: options.onEffectStart,
    onEffectComplete: options.onEffectComplete,
    signal: options.signal,
  };

  const previousCwd = process.cwd();
  const shouldChdir = cwd !== undefined && cwd !== previousCwd;
  if (shouldChdir) {
    process.chdir(cwd);
  }
  try {
    return journal === undefined
      ? await recordTask(task, runOptions)
      : await replayTask(task, journal, runOptions);
  } finally {
    if (shouldChdir) {
      process.chdir(previousCwd);
    }
  }
}
