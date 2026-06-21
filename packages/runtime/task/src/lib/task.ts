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
 * - Stack-safe: `flatMap`/`recover` build internal trampoline nodes (`FlatMap`/
 *   `Recover`) as data rather than recursing through continuations, so the
 *   interpreter realises bind and recovery on an explicit stack and stays
 *   stack-safe for arbitrarily long chains.
 *
 * The monad is parameterised over its leaf effect alphabet `E` (defaulting to
 * the built-in {@link Effect}), so the kernel itself is effect-agnostic.
 */

import type { Effect, Task, TaskError } from "./types.js";

// =============================================================================
// Core Constructors
// =============================================================================

/**
 * Lift a pure value into a Task.
 */
export const pure = <A, E = Effect>(value: A): Task<A, E> => ({
  _tag: "Pure",
  value,
});

/**
 * Create a Task from an Effect.
 * The continuation receives the result of executing the effect.
 */
export const effect = <A = unknown, E = Effect>(eff: E): Task<A, E> => ({
  _tag: "Effect",
  effect: eff,
  cont: (result): Task<A, E> => pure(result as A),
});

/**
 * Create a failed Task with an error.
 */
export const fail = <A = never, E = Effect>(error: TaskError): Task<A, E> => ({
  _tag: "Fail",
  error,
});

/**
 * Create a failed Task from an error code and message.
 */
export const failWith = <A = never, E = Effect>(
  code: string,
  message: string,
): Task<A, E> =>
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
 *
 * Builds an internal `FlatMap` trampoline node rather than recursing through
 * continuations, keeping arbitrarily long bind chains stack-safe; the
 * interpreter realises the bind on an explicit continuation stack.
 */
export const flatMap = <A, B, E = Effect>(
  task: Task<A, E>,
  f: (a: A) => Task<B, E>,
): Task<B, E> => ({
  _tag: "FlatMap",
  inner: task as Task<unknown, E>,
  f: f as (x: unknown) => Task<B, E>,
});

/**
 * Functor map.
 * Transform the result of a task with a pure function.
 */
export const map = <A, B, E = Effect>(
  task: Task<A, E>,
  f: (a: A) => B,
): Task<B, E> => flatMap(task, (a) => pure(f(a)));

/**
 * Apply a function wrapped in a Task to a value wrapped in a Task.
 */
export const ap = <A, B, E = Effect>(
  taskF: Task<(a: A) => B, E>,
  taskA: Task<A, E>,
): Task<B, E> => flatMap(taskF, (f) => map(taskA, f));

/**
 * Error recovery.
 * If the task fails, the handler can produce a new task.
 *
 * Builds an internal `Recover` trampoline node; the interpreter routes a `Fail`
 * raised while evaluating the inner task to the handler on its explicit
 * handler-frame stack, so recovery is stack-safe like bind.
 */
export const recover = <A, E = Effect>(
  task: Task<A, E>,
  handler: (error: TaskError) => Task<A, E>,
): Task<A, E> => ({
  _tag: "Recover",
  inner: task,
  handler,
});

/**
 * Map over the error of a failed task.
 */
export const mapError = <A, E = Effect>(
  task: Task<A, E>,
  f: (error: TaskError) => TaskError,
): Task<A, E> => recover(task, (error) => fail(f(error)));

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
// Generator Syntax
// =============================================================================

/**
 * A wrapper that makes a Task iterable, enabling `yield*` syntax
 * in generator-based task composition with proper type inference.
 */
export interface TaskGen<A> {
  [Symbol.iterator](): Generator<Task<unknown>, A, unknown>;
}

/**
 * Wrap a Task for use with `yield*` inside `gen()`.
 *
 * @example
 * ```typescript
 * const content = yield* $(readFile("package.json"))
 * ```
 */
export const $ = <A>(task: Task<A>): TaskGen<A> => ({
  *[Symbol.iterator]() {
    return (yield task) as A;
  },
});

/**
 * Write sequential effectful code using generator syntax.
 * Avoids nested flatMap chains for complex sequential tasks.
 *
 * Use `yield*` with `$(task)` to unwrap a task, getting back its value.
 * Under the hood this composes flatMap calls; the resulting task is driven by
 * the interpreter one step at a time, so even very long generators stay
 * stack-safe.
 *
 * @example
 * ```typescript
 * const myTask = gen(function* () {
 *   const content = yield* $(readFile("package.json"))
 *   const parsed = JSON.parse(content)
 *   yield* $(writeFile("output.json", JSON.stringify(parsed)))
 *   yield* $(info("Wrote output.json"))
 *   return parsed
 * })
 * ```
 */
export const gen = <A>(
  f: () => Generator<Task<unknown>, A, unknown>,
): Task<A> => {
  const iterator = f();

  const step = (nextValue: unknown): Task<A> => {
    const result = iterator.next(nextValue);
    if (result.done) {
      return pure(result.value);
    }
    return flatMap(result.value, (value) => step(value));
  };

  return step(undefined);
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a task is pure (no effects).
 */
export const isPure = <A, E = Effect>(
  t: Task<A, E>,
): t is { _tag: "Pure"; value: A } => t._tag === "Pure";

/**
 * Check if a task has failed.
 */
export const isFailed = <A, E = Effect>(
  t: Task<A, E>,
): t is { _tag: "Fail"; error: TaskError } => t._tag === "Fail";

/**
 * Check if a task has effects.
 */
export const hasEffects = <A, E = Effect>(
  t: Task<A, E>,
): t is {
  _tag: "Effect";
  effect: E;
  cont: (result: unknown) => Task<A, E>;
} => t._tag === "Effect";
