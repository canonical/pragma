/**
 * Bridge task-interpreter / summon-core error codes to the pragma boundary.
 *
 * A mutating verb's Task can fail with a code raised by summon-core's `execute`:
 * `GENERATOR_CANCELLED` when an attended-TTY user DECLINES the confirm gate, and
 * `MISSING_REQUIRED_ANSWER` / `GENERATOR_INVALID_ANSWER` for absent or invalid
 * non-interactive answers. `runTask` rethrows these as a `TaskExecutionError`
 * carrying `.code`. Without a bridge the CLI/MCP boundary collapses every
 * non-`PragmaError` to INTERNAL_ERROR + "report this issue" — telling a
 * user to file a bug for cancelling their own scaffold.
 *
 * The codes are matched as STRING LITERALS, never imported from summon-core, so
 * the kernel keeps summon-core out of its static import graph (the lazy-React /
 * lazy-summon discipline that is the whole reason `create` dynamic-imports it).
 */

import { PragmaError } from "./PragmaError.js";

/** summon-core's task-error code for a run declined at the confirm gate. */
const GENERATOR_CANCELLED = "GENERATOR_CANCELLED";

/** The interpreter's task-error code for a run aborted mid-flight (SIGINT). */
const TASK_INTERRUPTED = "TASK_INTERRUPTED";

/** summon-core task-error codes for absent/invalid non-interactive answers. */
const ANSWER_USAGE_CODES = new Set<string>([
  "MISSING_REQUIRED_ANSWER",
  "GENERATOR_INVALID_ANSWER",
]);

/** The clean, non-scary line shown when a user cancels at the confirm gate. */
export const CANCELLED_MESSAGE = "Cancelled.";

/** Read a task-interpreter error code off a thrown value, if it carries one. */
function taskErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const { code } = error as { code: unknown };
    if (typeof code === "string") return code;
  }
  return undefined;
}

/**
 * True when the throw is an attended user DECLINING the interactive confirm
 * gate — a deliberate choice, not a failure. The boundary renders this as a
 * clean cancellation (a plain message, success exit), never INTERNAL_ERROR.
 */
export function isCancellation(error: unknown): boolean {
  return taskErrorCode(error) === GENERATOR_CANCELLED;
}

/**
 * True when the throw is the interpreter aborting a run mid-flight — a SIGINT
 * on a `--yes`/CI run, or an in-wizard Ctrl-C DURING execution (which aborts
 * the run's controller). Distinct from {@link isCancellation}: a cancel is a
 * clean user decline (exit 0), an interruption stopped work already underway
 * (exit 130, UNIX 128+SIGINT). The boundary renders both with the same clean
 * "Cancelled." line — neither is a bug to report — but with different exit
 * codes.
 */
export function isInterruption(error: unknown): boolean {
  return taskErrorCode(error) === TASK_INTERRUPTED;
}

/**
 * The {@link PragmaError} a task failure CARRIES, if any. A task-layer failure
 * raised through the failure channel (`failPragma` — so an enclosing `recover`
 * such as setup's per-step isolation can catch it, which a synchronous throw
 * bypasses) stores the original PragmaError as the TaskError's `cause`;
 * `runTask` then wraps that TaskError in a `TaskExecutionError` whose
 * `taskError` carries it. Walk both wrappers (bounded — the shapes nest at
 * most a few levels) so the boundary recovers the ORIGINAL error with its
 * code, message, and recovery intact.
 */
function carriedPragmaError(error: unknown): PragmaError | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current !== undefined; depth += 1) {
    if (current instanceof PragmaError) return current;
    const record = current as { taskError?: unknown; cause?: unknown } | null;
    current = record?.taskError ?? record?.cause;
  }
  return undefined;
}

/**
 * Coerce a thrown value into a {@link PragmaError} for the CLI/MCP boundary,
 * bridging summon-core task-error codes: a `PragmaError` (direct, or carried
 * through the task failure channel as a TaskError `cause`) passes through
 * unchanged; absent/invalid non-interactive answers become INVALID_INPUT (a
 * usage error, exit 2); everything else stays INTERNAL_ERROR. Cancellation is
 * handled separately by {@link isCancellation} as a clean, non-error outcome.
 */
export function asPragmaError(error: unknown): PragmaError {
  const carried = carriedPragmaError(error);
  if (carried !== undefined) return carried;
  const message = error instanceof Error ? error.message : String(error);
  const code = taskErrorCode(error);
  if (code !== undefined && ANSWER_USAGE_CODES.has(code)) {
    return new PragmaError({ code: "INVALID_INPUT", message });
  }
  return PragmaError.internalError(message);
}
