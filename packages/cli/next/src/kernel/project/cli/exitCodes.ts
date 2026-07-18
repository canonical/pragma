/**
 * Process exit codes for the CLI projector (D2).
 *
 * The covenant freezes exactly four codes: success, a generic runtime failure,
 * a usage failure, and an unavailable store. {@link mapExitCode} routes every
 * {@link ErrorCode} into one of them — usage errors the shell can fix, a store
 * that is not reachable, and everything else as a runtime failure.
 */

import type { ErrorCode } from "../../error/types.js";

/** The four process exit codes the covenant blesses. */
export const EXIT = {
  /** Success. */
  OK: 0,
  /** Generic runtime failure (entity-not-found, empty, config, internal). */
  RUNTIME: 1,
  /** Usage failure (invalid/ambiguous input, unknown verb). */
  USAGE: 2,
  /** The knowledge-engine store could not be reached. */
  STORE_UNAVAILABLE: 3,
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
