export type HumanizeNumberOptions = {
  /**
   * The array of unit suffixes to use, starting with the base unit (e.g., "").
   * @default ["", "k", "M", "B", "T"]
   */
  units?: string[];

  /**
   * The base for the magnitude calculation.
   * This is typically 1000 for thousands, millions, etc.
   * If set to 10, it will use powers of 10 instead.
   * You might also use 1024 for binary prefixes (Ki, Mi, etc.).
   * @default 1000
   */
  magnitudeBase?: number;

  /**
   * Append this string to the display value to indicate truncation when the number has been truncated, indicating a loss of information due to rounding.
   */
  overflowIndicator?: string;
};

/**
 * Represents the result of humanizing a number.
 */
export interface HumanizeResult {
  /** The formatted value as a string, e.g., "1.2k" */
  displayValue: string;
  /** The numeric value before formatting, e.g., 1200 */
  value: number;
  /**
   * The unit suffix that was appended to the value, e.g., "k"
   * This might be useful for separately handling the unit, such as in aria labels.
   * */
  unit?: string;
}
