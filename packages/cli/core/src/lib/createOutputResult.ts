/**
 * Create an output result with data and render pair.
 *
 * Pass a non-zero `exitCode` for a result that must still render its output
 * (e.g. an all-not-found lookup printing its errors inline) yet signal failure
 * to callers.
 */
import type { CommandOutputResult, RenderPair } from "./types.js";

export default function createOutputResult<T>(
  value: T,
  render: RenderPair<T>,
  exitCode?: number,
): CommandOutputResult {
  return exitCode === undefined
    ? { tag: "output", value, render }
    : { tag: "output", value, render, exitCode };
}
