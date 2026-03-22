import type { ErrorCode } from "../error/types.js";
import { EXIT_CODES } from "./constants.js";

export default function mapExitCode(code: ErrorCode): number {
  return EXIT_CODES[code];
}
