import type { ErrorCode } from "../error/types.js";
import { EXIT_CODES } from "./constants.js";

/**
 * Map a PragmaError error code to a numeric process exit code.
 *
 * @param code - Machine-readable error code.
 * @returns Corresponding exit code from the EXIT_CODES table.
 */
export default function mapExitCode(code: ErrorCode): number {
  return EXIT_CODES[code];
}
