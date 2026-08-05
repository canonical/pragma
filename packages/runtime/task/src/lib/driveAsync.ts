import { TaskExecutionError } from "./errors.js";
import type { Effect, Task, TaskError } from "./types.js";

/**
 * A frame on the asynchronous interpreter's continuation stack: either a
 * pending bind (the `f` of a `FlatMap`) or an installed error-recovery handler
 * (the `handler` of a `Recover`).
 */
type AsyncFrame =
  | { kind: "bind"; f: (x: unknown) => Task<unknown> }
  | { kind: "recover"; handler: (error: TaskError) => Task<unknown> };

/**
 * Normalise a value thrown while performing an effect into a structured
 * {@link TaskError}, so a real I/O exception can be routed through the
 * interpreter's recovery channel rather than escaping it. A
 * {@link TaskExecutionError} carries its `taskError` through unchanged; a
 * filesystem `ENOENT` maps to `FILE_NOT_FOUND`; anything else becomes
 * `INTERNAL`, preserving the original throw as `cause`.
 *
 * It lives beside the driver rather than in `interpreter.ts` because it is part
 * of the driver's contract: every performer this trampoline drives — the real
 * one and the plan one — throws host exceptions, and both must map them the
 * same way or `recover`/`orElse`/`retry` would see different errors from a
 * plan than from the run it previews.
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
 * Build the loop-top interruption guard {@link driveAsync} calls. One spelling
 * for both node-side interpreters: the message an aborted run reports is part
 * of the CLI's observable behaviour (`isInterruption` matches on the code), and
 * a plan that reported a different one would diverge from the run it previews.
 *
 * @param signal - The caller's abort signal, if any.
 * @returns A guard that throws `TASK_INTERRUPTED` once the signal is aborted.
 */
export const interruptGuard =
  (signal: AbortSignal | undefined): (() => void) =>
  (): void => {
    if (signal?.aborted) {
      throw new TaskExecutionError({
        code: "TASK_INTERRUPTED",
        message: signal.reason
          ? `Task interrupted: ${signal.reason}`
          : "Task interrupted",
      });
    }
  };

/**
 * Drive a task to its final value asynchronously, resolving each leaf effect
 * through `performEffect`. This is the shared engine behind every node-side
 * interpreter: `runTask` (which performs effects for real) and `planTask`
 * (which performs the reads for real and simulates the destruction).
 *
 * Like {@link driveSync} it realises bind and error-recovery on an explicit
 * continuation/handler-frame stack rather than by recursing through the task
 * structure, so arbitrarily long `flatMap`/`gen` chains run in constant
 * call-stack depth.
 *
 * WHY this is extracted rather than copied. Three behaviours here are
 * load-bearing and each is easy to get subtly wrong in a second hand-written
 * copy: recovery frames unwind by *discarding* pending binds (so a failure
 * skips the rest of the chain), `TASK_INTERRUPTED` is carved out of recovery
 * entirely (a cancelled task must not be resurrected by an enclosing
 * `recover`/`orElse`/`retry`), and raw host throws are routed through
 * {@link normalizeThrownError} into the recovery channel rather than escaping
 * it. This programme's own record (L.01 §10.1) is that a decision re-derived at
 * three call sites was wrong at two; a second copied trampoline would re-arm
 * exactly that, and the divergence would be invisible — a plan and its run
 * would disagree only on the failure paths, which is where they matter most.
 *
 * @typeParam A - The task's result type.
 * @param root - The task to drive.
 * @param performEffect - Produces the result for each leaf effect. Structural
 * `Parallel`/`Race` effects are resolved by the caller inside `performEffect`,
 * typically by driving their children back through this same function.
 * @param checkInterrupted - Called at the top of every loop iteration; throw
 * from it to interrupt. Required rather than optional so no call site can
 * silently drive an uninterruptible task, and so this module carries no
 * untaken branch under the package's 100% coverage gate.
 * @returns The task's final value.
 * @note Impure — `performEffect` performs or records I/O.
 */
export default async function driveAsync<A>(
  root: Task<A>,
  performEffect: (effect: Effect) => Promise<unknown>,
  checkInterrupted: () => void,
): Promise<A> {
  const stack: AsyncFrame[] = [];
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
          const frame = stack.pop() as AsyncFrame;
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
        // Failure: unwind to the nearest recovery frame, discarding binds.
        cur = recoverFrom(cur.error);
        break;
    }
  }
}
