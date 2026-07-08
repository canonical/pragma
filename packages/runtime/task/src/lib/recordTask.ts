import { type RunTaskOptions, runTask } from "./interpreter.js";
import type { Journal, JournalRun, Task } from "./types.js";

/**
 * Run a task to completion while recording every effect outcome into a fresh
 * {@link Journal}, returning both the value and the journal.
 *
 * The journal can be serialised with {@link serializeJournal} for persistence,
 * or handed to {@link replayTask} to reproduce the run — replaying recorded
 * outcomes without performing any I/O.
 *
 * @typeParam A - The task's result type.
 * @param task - The task to run and record.
 * @param options - Interpreter options (context, prompt handler, signal, …); any
 * `journal` in it is ignored in favour of the fresh recording journal.
 * @returns The task's value and the journal captured during the run.
 * @note Impure — performs the task's effects while recording their outcomes.
 */
export default async function recordTask<A>(
  task: Task<A>,
  options: RunTaskOptions = {},
): Promise<JournalRun<A>> {
  const journal: Journal = { entries: [] };
  const value = await runTask(task, { ...options, journal });
  return { value, journal };
}
