/**
 * Process exit codes for the CLI projector (D2).
 *
 * The covenant freezes exactly four ERROR-CLASSIFICATION codes: success, a
 * generic runtime failure, a usage failure, and an unavailable store.
 * {@link mapExitCode} routes every {@link ErrorCode} into one of them — usage
 * errors the shell can fix, a store that is not reachable, and everything else
 * as a runtime failure.
 *
 * COVENANT NOTE — out-of-band codes bypass {@link mapExitCode} by design. The
 * dispatch catch sets two codes DIRECTLY, never through the map, so the frozen
 * `{0,1,2,3}` classification set is untouched:
 *   - a deliberate cancel (declining the confirm gate / an at-prompt Ctrl-C)
 *     exits {@link EXIT.OK} (0) — a user choice, not a failure; and
 *   - an interrupt ({@link EXIT.INTERRUPTED}, 130) — a run aborted by SIGINT or
 *     an in-wizard Ctrl-C mid-execution, following the UNIX 128+SIGINT
 *     convention. It is intentionally out-of-band from the four error codes and
 *     is NOT produced by `mapExitCode`.
 */

import type { ErrorCode } from "../../error/types.js";

/**
 * The process exit codes. The first four are the covenant's frozen
 * error-classification set (produced by {@link mapExitCode}); `INTERRUPTED` is
 * the out-of-band UNIX interrupt code set directly at the dispatch catch (see
 * the module doc), never routed through the map.
 */
export const EXIT = {
  /** Success. */
  OK: 0,
  /** Generic runtime failure (entity-not-found, empty, config, internal). */
  RUNTIME: 1,
  /** Usage failure (invalid/ambiguous input, unknown verb). */
  USAGE: 2,
  /** The knowledge-engine store could not be reached. */
  STORE_UNAVAILABLE: 3,
  /**
   * Interrupted by SIGINT / an in-wizard Ctrl-C during execution (UNIX
   * 128+SIGINT). Out-of-band from the four classification codes above: set
   * directly at the dispatch catch, NOT via {@link mapExitCode}.
   */
  INTERRUPTED: 130,
} as const;

/** Error codes that signal a usage mistake the caller can correct. */
const USAGE_CODES = new Set<ErrorCode>([
  "INVALID_INPUT",
  "AMBIGUOUS_INPUT",
  "UNKNOWN_VERB",
]);

/**
 * Map a {@link PragmaError} code to its numeric process exit code.
 *
 * Usage codes map to {@link EXIT.USAGE}, an unavailable store to
 * {@link EXIT.STORE_UNAVAILABLE}, and every other code — entity-not-found,
 * empty results, config error, internal error — to the generic
 * {@link EXIT.RUNTIME}.
 *
 * @param code - The error code to map.
 * @returns The corresponding process exit code.
 */
export function mapExitCode(code: ErrorCode): number {
  if (code === "STORE_UNAVAILABLE") return EXIT.STORE_UNAVAILABLE;
  if (USAGE_CODES.has(code)) return EXIT.USAGE;
  return EXIT.RUNTIME;
}
