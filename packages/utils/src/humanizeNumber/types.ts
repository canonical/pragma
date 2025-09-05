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

  /**
   * The strategy to use when the formatted number exceeds a certain length.
   * - "round": Truncates the number and appends the overflowIndicator if the representable value is less than the actual value.
   * - "clamp": Clamps the value to a specified minimum and/or maximum if provided in clampOptions.
   * @default "round"
   */
  humanizeType?: "round" | "clamp";

  /**
   * When using "clamp" as the humanizeType, this option allows you to set minimum and/or maximum bounds for the output value.
   * If the computed value is below the minimum, it will be set to the minimum.
   * If it is above the maximum, it will be set to the maximum.
   * This is useful for ensuring that the displayed value stays within a specific range.
   */
  clampOptions?: {
    min?: number;
    max?: number;
  };
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
