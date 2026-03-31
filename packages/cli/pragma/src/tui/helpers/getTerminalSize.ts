/**
 * Return the current terminal dimensions.
 *
 * Reads `process.stdout.columns` and `process.stdout.rows` directly.
 * Falls back to 80x24 when dimensions are unavailable (e.g., piped
 * output or non-TTY environments).
 */
export default function getTerminalSize(): {
  columns: number;
  rows: number;
} {
  return {
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  };
}
