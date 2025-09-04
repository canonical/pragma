export type HumanizeNumberOptions = {
  /**
   * The number of decimal places to round to for units greater than the base.
   * @default 1
   */
  decimals?: number;
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
