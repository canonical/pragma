/**
 * Compute the process exit code for a lookup result.
 *
 * A lookup that produced at least one result — even alongside some failures —
 * is a partial success and exits 0. A lookup where every query failed exits
 * non-zero, mapping the first error's code to its exit code so callers and
 * scripts can detect the failure. The errors are still rendered inline for the
 * human reader.
 */

import { ERROR_CODES, type ErrorCode } from "#error";
// mapExitCode is imported by its direct path, not the #pipeline barrel: the
// barrel re-exports runCli/createProgram, which would form an import cycle
// through this shared utility and break module initialization.
import mapExitCode from "../../pipeline/mapExitCode.js";
import type { LookupResult } from "./contracts.js";

/** Default non-zero exit when a lookup error carries an unrecognised code. */
const FALLBACK_LOOKUP_EXIT_CODE = 1;

/** Narrow an arbitrary error-code string to a known {@link ErrorCode}. */
function isErrorCode(code: string | undefined): code is ErrorCode {
  return (
    code !== undefined && (ERROR_CODES as readonly string[]).includes(code)
  );
}

/**
 * Resolve the exit code a lookup command should report.
 *
 * @param result - The resolved lookup result.
 * @returns 0 on success/partial success, else the mapped non-zero exit code.
 */
export default function resolveLookupExitCode<T>(
  result: LookupResult<T>,
): number {
  if (result.results.length > 0 || result.errors.length === 0) return 0;
  const firstCode = result.errors.at(0)?.code;
  return isErrorCode(firstCode)
    ? mapExitCode(firstCode)
    : FALLBACK_LOOKUP_EXIT_CODE;
}
