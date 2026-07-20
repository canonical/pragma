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
 * "please report this issue". (A spawn error like ENOENT REJECTS the effect
 * instead of resolving, so it never reaches here.)
 */

import { type ExecResult, fail, recover, type Task } from "@canonical/task";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { Recovery } from "../../kernel/error/types.js";

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
        "The command failed — often a permissions or network issue. Check the output above and retry (for a global install, try elevated privileges).",
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
      throw new PragmaError({
        code: "UNSUPPORTED",
        message: `\`${bin}\` was not found on your PATH.`,
        recovery,
      });
    }
    // Not a missing binary — re-raise unchanged (the interpreter rethrows it as
    // a TaskExecutionError, exactly as it would with no guard installed).
    return fail(error);
  });
}
