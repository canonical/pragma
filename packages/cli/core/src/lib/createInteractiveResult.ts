/**
 * Create an interactive result with a spec.
 */
import type { CommandInteractiveResult, InteractiveSpec } from "./types.js";

export default function createInteractiveResult(
  spec: InteractiveSpec,
): CommandInteractiveResult {
  return { tag: "interactive", spec };
}
