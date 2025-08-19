/**
 * Policy for whether to include fractional digits in formatted output.
 *
 * - "onlySmall": include decimals only when the scaled integer part has a single digit
 *   (e.g., 1.2k, 1.5M), otherwise show integers (e.g., 132M, 13B).
 * - "always": include up to the allowed fractional digits whenever available.
 * - "never": never include decimals; truncate to an integer part only.
 */
export type DecimalsPolicy = "onlySmall" | "always" | "never";

/**
 * Options for formatting large numbers with unit suffixes.
 */
export interface FormatNumberOptions {
  /** Array of unit suffixes used for each 10^3 step. Defaults to ["", "k", "M", "B", "T"] */
  units?: string[];
  /** Total number of significant digits to display per scaled value. Defaults to 3. */
  significantDigits?: number;
  /** Controls when decimals are shown. Defaults to "onlySmall". */
  decimalsPolicy?: DecimalsPolicy;
}

/**
 * Result of formatting a number with unit information
 */
export interface FormatResult {
  /**
   * The formatted display value, e.g., "1.2k", "132M", "999T".
   */
  displayValue: string;
  /**
   * The unit suffix applied, e.g., "k", "M", "B", "T".
   */
  unitSuffix: string;
  /**
   * The index of the unit in the units array, useful for further processing.
   */
  unitIndex: number;
}
