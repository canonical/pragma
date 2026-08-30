/**
 * Guard an `exec`-composing Task against a silently-swallowed nonzero exit.
 *
 * The `@canonical/task` interpreter RESOLVES the `exec` effect on a nonzero exit
 * code — it only REJECTS on a spawn error (e.g. ENOENT). A consumer that yields
 * `exec` and ignores `ExecResult.exitCode` therefore reports a failed command
 * (the common case being an EACCES-denied global `npm i -g`) as a silent
 * success, discarding the subprocess's own stderr. Every `exec` consumer in
 * `next/src` (`upgrade`, `setup lsp`) calls this immediately after its `exec`
 * yield, so a failed subprocess surfaces as UNSUPPORTED (exit 1) carrying the
 * command and the captured stderr instead of being reported as done.
 *
 * A denied `npm i -g` (EACCES), a registry/network failure, or any other
 * nonzero exit is a fixable ENVIRONMENT condition — NOT a pragma bug — so it is
 * classified UNSUPPORTED with an actionable recovery, never INTERNAL_ERROR's
 * "report this issue". (A spawn error like ENOENT REJECTS the effect
 * instead of resolving, so it never reaches here.)
 */

import {
  type ExecResult,
  fail,
  pure,
  recover,
  type Task,
} from "@canonical/task";
import type { Recovery } from "../../kernel/error/index.js";
import { PragmaError } from "../../kernel/error/index.js";

/**
 * Route a {@link PragmaError} through the Task FAILURE CHANNEL (a `Fail` node
 * carrying the error as `cause`) instead of a synchronous throw.
 *
 * The distinction is load-bearing: a synchronous throw from a bind/recover
 * continuation ESCAPES the interpreter's trampoline entirely — no enclosing
 * `recover` can see it — whereas a `Fail` node unwinds to the nearest recovery
 * frame. Setup's run-all isolates each step with `recover` so one failed step
 * cannot abort the rest (S1-1); that only works if step failures travel the
 * failure channel. The boundary (`asPragmaError`) unwraps the carried cause,
 * so a failure that escapes un-recovered still renders with its own code,
 * message, and recovery — never the INTERNAL_ERROR catch-all.
 */
export function failPragma(error: PragmaError): Task<never> {
  return fail({ code: error.code, message: error.message, cause: error });
}

/**
 * The failure-channel sibling of {@link assertExecOk}: yield `pure(undefined)`
 * on exit 0, otherwise fail with an UNSUPPORTED {@link PragmaError} carrying
 * the command, exit code, trimmed stderr, and the CALLER'S recovery — the
 * recovery must name an action that works on this machine now, not the generic
 * "permissions or network" guess.
 *
 * @param command - Human-readable command, surfaced in the error message.
 * @param result - The {@link ExecResult} the `exec` effect yielded.
 * @param recovery - The actionable, site-specific recovery.
 * @returns A Task that succeeds on exit 0 and fails (recoverably) otherwise.
 */
export function checkExecOk(
  command: string,
  result: ExecResult,
  recovery: Recovery,
): Task<void> {
  if (result.exitCode === 0) return pure(undefined);
  const stderr = result.stderr.trim();
  return failPragma(
    new PragmaError({
      code: "UNSUPPORTED",
      message: `\`${command}\` exited with code ${result.exitCode}.${
        stderr ? `\n${stderr}` : ""
      }`,
      recovery,
    }),
  );
}

/**
 * Raise UNSUPPORTED when an `exec` result carries a nonzero exit code.
 *
 * @param command - Human-readable command, surfaced in the error message.
 * @param result - The {@link ExecResult} the `exec` effect yielded.
 * @throws PragmaError UNSUPPORTED (exit 1) when `result.exitCode !== 0`,
 *   including the trimmed stderr when the subprocess emitted any, plus an
 *   actionable recovery (a permissions/network failure the user can retry).
 */
export function assertExecOk(command: string, result: ExecResult): void {
  if (result.exitCode === 0) return;
  const stderr = result.stderr.trim();
  throw new PragmaError({
    code: "UNSUPPORTED",
    message: `\`${command}\` exited with code ${result.exitCode}.${
      stderr ? `\n${stderr}` : ""
    }`,
    recovery: {
      message:
        "Check the command's output above; a global install may need elevated privileges.",
    },
  });
}

/**
 * True when a rejected/normalised `exec` error is a missing-binary spawn failure.
 *
 * A spawn `ENOENT` (the command is absent from PATH) REJECTS the `exec` effect —
 * unlike a nonzero exit, which RESOLVES it (see {@link assertExecOk}). The task
 * interpreter normalises that reject into a `FILE_NOT_FOUND` TaskError carrying
 * the raw spawn error as `.cause`, so this unwraps one level to recognise both
 * the raw and normalised shapes.
 *
 * @param error - The thrown/rejected value (raw spawn error or its TaskError).
 * @returns Whether it denotes a binary missing from PATH.
 */
export function isMissingBinaryError(error: unknown): boolean {
  const codeOf = (value: unknown): unknown =>
    value && typeof value === "object" && "code" in value
      ? (value as { code: unknown }).code
      : undefined;
  if (codeOf(error) === "ENOENT") return true;
  const cause = (error as { cause?: unknown } | null | undefined)?.cause;
  return codeOf(cause) === "ENOENT";
}

/**
 * Wrap an `exec`-composing Task so a missing-binary spawn (ENOENT) surfaces as a
 * named UNSUPPORTED "`<bin>` not found on PATH" error with actionable recovery,
 * rather than the interpreter's raw reject collapsing to INTERNAL_ERROR ("please
 * report this issue") at the CLI/MCP boundary. Every spawn site that may hit an
 * absent binary (`upgrade`'s package manager, `setup lsp`'s `bunx`) wraps its
 * Task with this so they never reach the catch-all.
 *
 * Only real execution can trip it: a dry-run/plan mocks `exec` (exit 0, no
 * spawn), so the guard is transparent to the preview. A nonzero exit RESOLVES
 * the effect and is still {@link assertExecOk}'s job (its throw is a synchronous
 * generator-body throw, not an effect failure, so it bypasses this handler); any
 * other effect failure re-raises unchanged.
 *
 * @param bin - The binary name surfaced in the error message.
 * @param recovery - The install/PATH recovery hint.
 * @param task - The Task whose `exec` effect may reject with ENOENT.
 * @returns The Task, guarded against a missing-binary spawn.
 */
export function guardMissingBinary<A>(
  bin: string,
  recovery: Recovery,
  task: Task<A>,
): Task<A> {
  return recover(task, (error) => {
    if (isMissingBinaryError(error)) {
      // Failure CHANNEL, not a synchronous throw: an enclosing recover (the
      // run-all's per-step isolation, S1-1) must be able to catch this, and
      // the boundary unwraps the carried PragmaError when nothing does.
      return failPragma(
        new PragmaError({
          code: "UNSUPPORTED",
          message: `\`${bin}\` was not found on your PATH.`,
          recovery,
        }),
      );
    }
    // Not a missing binary — re-raise unchanged (the interpreter rethrows it as
    // a TaskExecutionError, exactly as it would with no guard installed).
    return fail(error);
  });
}
