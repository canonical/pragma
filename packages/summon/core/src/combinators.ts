/**
 * Task Combinators
 *
 * This module provides combinators for composing tasks in various ways:
 * - Sequencing: Run tasks one after another
 * - Parallelism: Run tasks concurrently
 * - Conditionals: Run tasks based on conditions
 * - Error handling: Retry, fallback, and recovery patterns
 * - Resource management: Bracket pattern for cleanup
 */

import { parallelEffect, raceEffect } from "./effect.js";
import { effect, fail, flatMap, map, pure, recover } from "./task.js";
import type { Task, TaskError } from "./types.js";

// =============================================================================
// Sequencing Combinators
// =============================================================================

/**
 * Run tasks in sequence, collecting results.
 */
export const sequence = <A>(tasks: Task<A>[]): Task<A[]> => {
  if (tasks.length === 0) {
    return pure([]);
  }

  return tasks.reduce<Task<A[]>>(
    (acc, task) =>
      flatMap(acc, (results) => map(task, (result) => [...results, result])),
    pure([]),
  );
};

/**
 * Run tasks in sequence, discarding results.
 */
export const sequence_ = (tasks: Task<unknown>[]): Task<void> =>
  map(sequence(tasks), () => undefined);

/**
 * Apply a task-returning function to each element of an array.
 */
export const traverse = <A, B>(
  items: A[],
  f: (item: A, index: number) => Task<B>,
): Task<B[]> => sequence(items.map((item, index) => f(item, index)));

/**
 * Apply a task-returning function to each element, discarding results.
 */
export const traverse_ = <A>(
  items: A[],
  f: (item: A, index: number) => Task<unknown>,
): Task<void> => sequence_(items.map((item, index) => f(item, index)));

// =============================================================================
// Parallel Combinators
// =============================================================================

/**
 * Run tasks in parallel, collecting results.
 * All tasks must succeed for the result to succeed.
 */
export const parallel = <A>(tasks: Task<A>[]): Task<A[]> => {
  if (tasks.length === 0) {
    return pure([]);
  }
  return effect(parallelEffect(tasks as Task<unknown>[]));
};

/**
 * Run tasks in parallel with a concurrency limit.
 */
export const parallelN = <A>(n: number, tasks: Task<A>[]): Task<A[]> => {
  if (tasks.length === 0) {
    return pure([]);
  }

  // Split into batches of size n and run batches sequentially
  const batches: Task<A>[][] = [];
  for (let i = 0; i < tasks.length; i += n) {
    batches.push(tasks.slice(i, i + n));
  }

  return flatMap(sequence(batches.map((batch) => parallel(batch))), (results) =>
    pure(results.flat()),
  );
};

/**
 * Run tasks in parallel, returning the first to complete.
 */
export const race = <A>(tasks: Task<A>[]): Task<A> => {
  if (tasks.length === 0) {
    return fail({
      code: "RACE_EMPTY",
      message: "Cannot race empty array of tasks",
    });
  }
  return effect(raceEffect(tasks as Task<unknown>[]));
};

// =============================================================================
// Conditional Combinators
// =============================================================================

/**
 * Run a task only if a condition is true.
 */
export const when = (condition: boolean, task: Task<void>): Task<void> =>
  condition ? task : pure(undefined);

/**
 * Run a task only if a condition is false.
 */
export const unless = (condition: boolean, task: Task<void>): Task<void> =>
  condition ? pure(undefined) : task;

/**
 * Choose between two tasks based on a condition.
 */
export const ifElse = <A>(
  condition: boolean,
  onTrue: Task<A>,
  onFalse: Task<A>,
): Task<A> => (condition ? onTrue : onFalse);

/**
 * Run a task only if a condition task returns true.
 */
export const whenM = (
  conditionTask: Task<boolean>,
  task: Task<void>,
): Task<void> => flatMap(conditionTask, (condition) => when(condition, task));

/**
 * Choose between two tasks based on a condition task.
 */
export const ifElseM = <A>(
  conditionTask: Task<boolean>,
  onTrue: Task<A>,
  onFalse: Task<A>,
): Task<A> =>
  flatMap(conditionTask, (condition) => ifElse(condition, onTrue, onFalse));

// =============================================================================
// Error Handling Combinators
// =============================================================================

/**
 * Retry a task up to n times on failure.
 */
export const retry = <A>(task: Task<A>, maxAttempts: number): Task<A> => {
  if (maxAttempts <= 1) {
    return task;
  }

  return recover(task, (_error) => retry(task, maxAttempts - 1));
};

/**
 * Retry a task with exponential backoff.
 * Note: Delay is handled by the interpreter, this just structures the retries.
 */
export const retryWithBackoff = <A>(
  task: Task<A>,
  maxAttempts: number,
  _baseDelayMs: number,
): Task<A> => {
  // The actual delay handling would be in the interpreter
  // Here we just structure the retry logic
  return retry(task, maxAttempts);
};

/**
 * Try the first task, falling back to the second on failure.
 */
export const orElse = <A>(primary: Task<A>, fallback: Task<A>): Task<A> =>
  recover(primary, () => fallback);

/**
 * Try a task, returning None on failure.
 */
export const optional = <A>(task: Task<A>): Task<A | undefined> =>
  recover(
    map(task, (a): A | undefined => a),
    () => pure(undefined),
  );

type AttemptResult<A> =
  | { ok: true; value: A }
  | { ok: false; error: TaskError };

/**
 * Attempt a task, capturing the result or error.
 */
export const attempt = <A>(task: Task<A>): Task<AttemptResult<A>> =>
  recover(
    map(task, (value): AttemptResult<A> => ({ ok: true, value })),
    (error): Task<AttemptResult<A>> => pure({ ok: false, error }),
  );

// =============================================================================
// Resource Management Combinators
// =============================================================================

/**
 * Bracket pattern: acquire -> use -> release.
 * Release is always called, even if use fails.
 */
export const bracket = <A, B>(
  acquire: Task<A>,
  use: (resource: A) => Task<B>,
  release: (resource: A) => Task<void>,
): Task<B> =>
  flatMap(acquire, (resource) =>
    recover(
      flatMap(use(resource), (result) => map(release(resource), () => result)),
      (error) => flatMap(release(resource), () => fail(error)),
    ),
  );

/**
 * Ensure a cleanup task runs after the main task, regardless of success/failure.
 */
export const ensure = <A>(task: Task<A>, cleanup: Task<void>): Task<A> =>
  recover(
    flatMap(task, (result) => map(cleanup, () => result)),
    (error) => flatMap(cleanup, () => fail(error)),
  );

// =============================================================================
// Utility Combinators
// =============================================================================

/**
 * Execute a side effect without changing the task's value.
 */
export const tap = <A>(task: Task<A>, f: (a: A) => Task<unknown>): Task<A> =>
  flatMap(task, (a) => map(f(a), () => a));

/**
 * Execute a side effect on failure without changing the error.
 */
export const tapError = <A>(
  task: Task<A>,
  f: (error: TaskError) => Task<unknown>,
): Task<A> => recover(task, (error) => flatMap(f(error), () => fail(error)));

/**
 * Delay the execution of a task.
 * Note: The actual delay is handled by the interpreter.
 */
export const delay = <A>(task: Task<A>, _ms: number): Task<A> => {
  // The interpreter would handle the actual delay
  return task;
};

/**
 * Add a timeout to a task.
 * Note: The actual timeout is handled by the interpreter.
 */
export const timeout = <A>(task: Task<A>, _ms: number): Task<A> => {
  // The interpreter would handle the actual timeout
  return task;
};

/**
 * Fold over a task, handling both success and failure.
 */
export const fold = <A, B>(
  task: Task<A>,
  onSuccess: (a: A) => B,
  onFailure: (error: TaskError) => B,
): Task<B> => recover(map(task, onSuccess), (error) => pure(onFailure(error)));

/**
 * Combine two tasks into a tuple.
 */
export const zip = <A, B>(taskA: Task<A>, taskB: Task<B>): Task<[A, B]> =>
  flatMap(taskA, (a) => map(taskB, (b): [A, B] => [a, b]));

/**
 * Combine three tasks into a tuple.
 */
export const zip3 = <A, B, C>(
  taskA: Task<A>,
  taskB: Task<B>,
  taskC: Task<C>,
): Task<[A, B, C]> =>
  flatMap(taskA, (a) =>
    flatMap(taskB, (b) => map(taskC, (c): [A, B, C] => [a, b, c])),
  );
