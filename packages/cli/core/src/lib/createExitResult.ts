/**
 * Create an exit result with a code.
 */
import type { CommandExitResult } from "./types.js";

export default function createExitResult(code: number): CommandExitResult {
  return { tag: "exit", code };
}
