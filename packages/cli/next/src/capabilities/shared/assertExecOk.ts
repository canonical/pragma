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

import type { ExecResult } from "@canonical/task";
import { PragmaError } from "../../kernel/error/PragmaError.js";

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
