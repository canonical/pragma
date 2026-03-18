/**
 * Create an output result with data and render pair.
 */
import type { CommandOutputResult, RenderPair } from "./types.js";

export default function createOutputResult<T>(
  value: T,
  render: RenderPair<T>,
): CommandOutputResult {
  return { tag: "output", value, render };
}
