/** Return type for the useTerminalSize hook. */
export interface UseTerminalSizeResult {
  /** Terminal width in columns. Falls back to 80 if not detectable. */
  readonly columns: number;
  /** Terminal height in rows. Falls back to 24 if not detectable. */
  readonly rows: number;
}
