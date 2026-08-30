/**
 * The shared asynchronous trampoline behind the node-side interpreters: the
 * production `runTask` and the preview `runPreview` both drive tasks through
 * this one loop, so bind, recovery, and error normalisation cannot drift
 * between "run it" and "preview it" — which is the whole point of an honest
 * preview.
 *
 * Node-free itself (it performs no I/O; the injected `performEffect` does), it
 * lives beside `driveSync`, its synchronous sibling for the mock interpreters.
 */

import { TaskExecutionError } from "./errors.js";
import type { Effect, Task, TaskError } from "./types.js";

/**
 * A frame on the interpreter's explicit continuation stack: either a pending
 * bind (the `f` of a `FlatMap`) or an installed error-recovery handler (the
 * `handler` of a `Recover`).
 */
type Frame =
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
 * @param thrown - The value thrown while performing an effect.
 * @returns The equivalent structured task error.
 */
export const normalizeThrownError = (thrown: unknown): TaskError => {
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
 * Drive a task to its final value on an explicit stack of bind/recover frames,
 * so no node type recurses through the host call stack: arbitrarily long
 * `flatMap`/`gen` chains run in constant call-stack depth. `performEffect`
 * supplies each leaf effect's result (the production interpreter executes it,
 * the preview interpreter resolves it against its overlay); structural
 * `Parallel`/`Race` effects are the caller's to handle inside `performEffect`.
 *
 * A raw exception from an effect (e.g. ENOENT from a real read, or a throwing
 * `TransformFile` transform) is normalised and routed through the recovery
 * channel, so recover/retry/orElse see real I/O failures — not just explicit
 * `Fail` nodes. Interruption (`TASK_INTERRUPTED`) is the one exception: an
 * abort surfaced from a `Parallel`/`Race` child bypasses recovery, preserving
 * the invariant that a cancelled task cannot be resurrected by an enclosing
 * recover/orElse/retry. With no recovery frame installed, a failure escapes as
 * a {@link TaskExecutionError}.
 *
 * @param root - The task to drive.
 * @param performEffect - Produces the result for each leaf effect.
 * @param checkpoint - Invoked before every step (the production interpreter's
 *   abort check); omitted for interpreters with nothing to poll.
 * @returns The task's final value.
 */
export default async function driveAsync(
  root: Task<unknown>,
  performEffect: (effect: Effect) => Promise<unknown>,
  checkpoint?: () => void,
): Promise<unknown> {
  const stack: Frame[] = [];
  let cur: Task<unknown> = root;

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
    checkpoint?.();

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
          result = await performEffect(cur.effect);
        } catch (thrown) {
          const taskError = normalizeThrownError(thrown);
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
          const frame = stack.pop() as Frame;
          if (frame.kind === "bind") {
            cur = frame.f(value);
            resumed = true;
            break;
          }
        }
        if (!resumed) {
          return value;
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
