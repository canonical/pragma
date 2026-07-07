import { TaskExecutionError } from "./interpreter.js";
import type { Effect, Task, TaskError } from "./types.js";

/**
 * A frame on the synchronous interpreter's continuation stack: either a pending
 * bind (the `f` of a `FlatMap`) or an installed error-recovery handler (the
 * `handler` of a `Recover`).
 */
type SyncFrame =
  | { kind: "bind"; f: (x: unknown) => Task<unknown> }
  | { kind: "recover"; handler: (error: TaskError) => Task<unknown> };

/**
 * Drive a task to its final value synchronously, resolving each leaf effect
 * through `resolveEffect`. This is the shared engine behind the preview
 * interpreters (`dryRun`, `dryRunWith`, `collectEffects`) and the undo
 * collector (`collectUndos`): like the production `runTask` interpreter it
 * realises bind and error-recovery on an explicit continuation/handler-frame
 * stack rather than by recursing through the task structure, so arbitrarily
 * long `flatMap`/`gen` chains run in constant call-stack depth.
 *
 * `resolveEffect` returns the value a leaf effect would produce (a mock, a
 * collected placeholder, and so on) and may record effects or mutate caller
 * state as a side effect. Structural `Parallel`/`Race` effects are resolved by
 * the caller inside `resolveEffect`, typically by driving their children. A
 * `Fail` node — or a {@link TaskExecutionError} thrown by `resolveEffect` —
 * unwinds to the nearest recovery frame; with none installed it throws
 * `TaskExecutionError`, matching the production interpreter. Any other thrown
 * value propagates unchanged.
 *
 * @typeParam A - The task's result type.
 * @param root - The task to drive.
 * @param resolveEffect - Produces the result for each leaf effect.
 * @returns The task's final value.
 * @note Impure — `resolveEffect` typically records effects or mutates caller
 * state.
 */
export default function driveSync<A>(
  root: Task<A>,
  resolveEffect: (effect: Effect) => unknown,
): A {
  const stack: SyncFrame[] = [];
  let cur: Task<unknown> = root as Task<unknown>;

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
        let result: unknown;
        try {
          result = resolveEffect(cur.effect);
        } catch (thrown) {
          if (thrown instanceof TaskExecutionError) {
            cur = recoverFrom(thrown.taskError);
            break;
          }
          throw thrown;
        }
        cur = cur.cont(result);
        break;
      }

      case "Pure": {
        // Success: unwind to the next bind frame, discarding recovery frames.
        const value = cur.value;
        let resumed = false;
        while (stack.length > 0) {
          const frame = stack.pop() as SyncFrame;
          if (frame.kind === "bind") {
            cur = frame.f(value);
            resumed = true;
            break;
          }
        }
        if (!resumed) {
          return value as A;
        }
        break;
      }

      case "Fail":
        cur = recoverFrom(cur.error);
        break;
    }
  }
}
