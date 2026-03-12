/**
 * Props for the Example component.
 */
export interface BaseProps {
  /**
   * The label text to display
   */
  label?: string;

  /**
   * Display variant
   * - `undefined`: Standard appearance
   * - `"outlined"`: Outlined style
   */
  variant?: "outlined";
}
