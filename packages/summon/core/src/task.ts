/**
 * Task Monad Implementation
 *
 * The Task monad is the core abstraction for building composable, testable generators.
 * Tasks represent computations that may perform effects and can fail.
 *
 * Key properties:
 * - Pure: Tasks return effect descriptions, not actual effects
 * - Composable: Tasks can be sequenced with flatMap/chain
 * - Testable: Effects can be collected without execution
 * - Type-safe: Full TypeScript inference for composed tasks
 */

import type { Effect, Task, TaskError } from "./types.js";

// =============================================================================
// Core Constructors
// =============================================================================

/**
 * Lift a pure value into a Task.
 */
export const pure = <A>(value: A): Task<A> => ({
  _tag: "Pure",
  value,
});

/**
 * Create a Task from an Effect.
 * The continuation receives the result of executing the effect.
 */
export const effect = <A>(eff: Effect): Task<A> => ({
  _tag: "Effect",
  effect: eff,
  cont: (result) => pure(result as A),
});

/**
 * Create a failed Task with an error.
 */
export const fail = <A = never>(error: TaskError): Task<A> => ({
  _tag: "Fail",
  error,
});

/**
 * Create a failed Task from an error code and message.
 */
export const failWith = <A = never>(code: string, message: string): Task<A> =>
  fail({
    code,
    message,
  });

// =============================================================================
// Monad Operations
// =============================================================================

/**
 * Monadic bind (flatMap).
 * Sequences two tasks, passing the result of the first to produce the second.
 */
export const flatMap = <A, B>(task: Task<A>, f: (a: A) => Task<B>): Task<B> => {
  switch (task._tag) {
    case "Pure":
      return f(task.value);
    case "Fail":
      return task as unknown as Task<B>;
    case "Effect":
      return {
        _tag: "Effect",
        effect: task.effect,
        cont: (result) => flatMap(task.cont(result), f),
      };
  }
};

/**
 * Functor map.
 * Transform the result of a task with a pure function.
 */
export const map = <A, B>(task: Task<A>, f: (a: A) => B): Task<B> =>
  flatMap(task, (a) => pure(f(a)));

/**
 * Apply a function wrapped in a Task to a value wrapped in a Task.
 */
export const ap = <A, B>(taskF: Task<(a: A) => B>, taskA: Task<A>): Task<B> =>
  flatMap(taskF, (f) => map(taskA, f));

/**
 * Error recovery.
 * If the task fails, the handler can produce a new task.
 */
export const recover = <A>(
  task: Task<A>,
  handler: (error: TaskError) => Task<A>,
): Task<A> => {
  switch (task._tag) {
    case "Pure":
      return task;
    case "Fail":
      return handler(task.error);
    case "Effect":
      return {
        _tag: "Effect",
        effect: task.effect,
        cont: (result) => recover(task.cont(result), handler),
      };
  }
};

/**
 * Map over the error of a failed task.
 */
export const mapError = <A>(
  task: Task<A>,
  f: (error: TaskError) => TaskError,
): Task<A> => {
  switch (task._tag) {
    case "Pure":
      return task;
    case "Fail":
      return fail(f(task.error));
    case "Effect":
      return {
        _tag: "Effect",
        effect: task.effect,
        cont: (result) => mapError(task.cont(result), f),
      };
  }
};

// =============================================================================
// Fluent Builder API
// =============================================================================

/**
 * Fluent builder for composing tasks.
 * Provides a chainable API for common task operations.
 */
export class TaskBuilder<A> {
  constructor(private readonly _task: Task<A>) {}

  /**
   * Transform the result with a pure function.
   */
  map<B>(f: (a: A) => B): TaskBuilder<B> {
    return new TaskBuilder(map(this._task, f));
  }

  /**
   * Chain with another task-producing function.
   */
  flatMap<B>(f: (a: A) => Task<B>): TaskBuilder<B> {
    return new TaskBuilder(flatMap(this._task, f));
  }

  /**
   * Chain with another TaskBuilder-producing function.
   */
  chain<B>(f: (a: A) => TaskBuilder<B>): TaskBuilder<B> {
    return new TaskBuilder(flatMap(this._task, (a) => f(a).unwrap()));
  }

  /**
   * Recover from errors.
   */
  recover(f: (error: TaskError) => Task<A>): TaskBuilder<A> {
    return new TaskBuilder(recover(this._task, f));
  }

  /**
   * Map over errors.
   */
  mapError(f: (error: TaskError) => TaskError): TaskBuilder<A> {
    return new TaskBuilder(mapError(this._task, f));
  }

  /**
   * Execute a side effect without changing the value.
   */
  tap(f: (a: A) => Task<unknown>): TaskBuilder<A> {
    return new TaskBuilder(flatMap(this._task, (a) => map(f(a), () => a)));
  }

  /**
   * Sequence with another task, discarding the current value.
   * Useful for chaining void tasks.
   *
   * @example
   * task(mkdir("output"))
   *   .andThen(writeFile("output/a.txt", "A"))
   *   .andThen(writeFile("output/b.txt", "B"))
   *   .andThen(info("Done!"))
   */
  andThen<B>(next: Task<B>): TaskBuilder<B> {
    return new TaskBuilder(flatMap(this._task, () => next));
  }

  /**
   * Extract the underlying Task.
   */
  unwrap(): Task<A> {
    return this._task;
  }
}

/**
 * Create a TaskBuilder from a Task.
 */
export const task = <A>(t: Task<A>): TaskBuilder<A> => new TaskBuilder(t);

/**
 * Create a TaskBuilder from a pure value.
 */
export const of = <A>(value: A): TaskBuilder<A> => task(pure(value));

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a task is pure (no effects).
 */
export const isPure = <A>(t: Task<A>): t is { _tag: "Pure"; value: A } =>
  t._tag === "Pure";

/**
 * Check if a task has failed.
 */
export const isFailed = <A>(
  t: Task<A>,
): t is { _tag: "Fail"; error: TaskError } => t._tag === "Fail";

/**
 * Check if a task has effects.
 */
export const hasEffects = <A>(
  t: Task<A>,
): t is {
  _tag: "Effect";
  effect: Effect;
  cont: (result: unknown) => Task<A>;
} => t._tag === "Effect";
