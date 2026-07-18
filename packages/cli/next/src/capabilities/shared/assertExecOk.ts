/**
 * Guard an `exec`-composing Task against a silently-swallowed nonzero exit.
 *
 * The `@canonical/task` interpreter RESOLVES the `exec` effect on a nonzero exit
 * code — it only REJECTS on a spawn error (e.g. ENOENT). A consumer that yields
 * `exec` and ignores `ExecResult.exitCode` therefore reports a failed command
 * (the common case being an EACCES-denied global `npm i -g`) as a silent
 * success, discarding the subprocess's own stderr. Every `exec` consumer in
 * `next/src` (`upgrade`, `setup lsp`) calls this immediately after its `exec`
 * yield, so a failed subprocess surfaces as INTERNAL_ERROR (exit 1) carrying the
 * command and the captured stderr instead of being reported as done.
 */

import type { ExecResult } from "@canonical/task";
import { PragmaError } from "../../kernel/error/PragmaError.js";

/**
 * Raise INTERNAL_ERROR when an `exec` result carries a nonzero exit code.
 *
 * @param command - Human-readable command, surfaced in the error message.
 * @param result - The {@link ExecResult} the `exec` effect yielded.
 * @throws PragmaError INTERNAL_ERROR (exit 1) when `result.exitCode !== 0`,
 *   including the trimmed stderr when the subprocess emitted any.
 */
export function assertExecOk(command: string, result: ExecResult): void {
  if (result.exitCode === 0) return;
  const stderr = result.stderr.trim();
  throw PragmaError.internalError(
    `\`${command}\` exited with code ${result.exitCode}.${
      stderr ? `\n${stderr}` : ""
    }`,
  );
}
