import type { UseTerminalSizeResult } from "./types.js";

/**
 * Return the current terminal dimensions.
 *
 * Reads `process.stdout.columns` and `process.stdout.rows` directly.
 * Falls back to 80x24 when dimensions are unavailable (e.g., piped
 * output, or Ink's renderToString mode where stdout is not attached).
 *
 * For renderToString usage, Ink passes the column width via its own
 * options — this hook provides the value for components that need
 * to compute layout independently.
 */
export default function useTerminalSize(): UseTerminalSizeResult {
  return {
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  };
}
