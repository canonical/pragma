import { type RunTaskOptions, runTask } from "./interpreter.js";
import type { Journal, JournalRun, Task } from "./types.js";

/**
 * Re-run a task against a recorded {@link Journal}.
 *
 * Every effect whose identity matches the recording replays its outcome with no
 * I/O; if the task runs past the recorded prefix — a resumed run — the remaining
 * effects execute for real and are appended. The input journal is never mutated:
 * the returned journal is a fresh copy carrying any resumed entries. A structural
 * mismatch against the recording throws `JournalDivergenceError`, and a task that
 * ends before consuming the whole recording throws `JournalIncompleteError`.
 *
 * Pass a freshly-built task, not the instance that was recorded: a `gen`-based
 * task holds a single-use iterator, so replaying an already-run instance would
 * end early (caught as `JournalIncompleteError`). A replayed failure carries only
 * its `code` and `message`, so a recovery handler branching on `error.cause`
 * must not be journaled.
 *
 * @typeParam A - The task's result type.
 * @param task - The task to replay.
 * @param journal - The journal recorded by a prior {@link recordTask} run.
 * @param options - Interpreter options (context, prompt handler, signal, …); any
 * `journal` in it is ignored in favour of the supplied one.
 * @returns The task's value and the replayed (possibly extended) journal.
 * @note Impure — replays recorded outcomes and executes any effects performed
 * past the recorded prefix.
 */
export default async function replayTask<A>(
  task: Task<A>,
  journal: Journal,
  options: RunTaskOptions = {},
): Promise<JournalRun<A>> {
  const working: Journal = { entries: journal.entries.slice() };
  const value = await runTask(task, { ...options, journal: working });
  return { value, journal: working };
}
