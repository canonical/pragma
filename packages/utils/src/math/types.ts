/**
 * Overflow handling strategy when a number cannot fit within maxLength.
 */
export type OverflowStrategy =
  | "truncate" // Show max representable value with "+" (e.g., "999+" for 4 chars)
  | "compact"; // Try to fit using unit suffixes (e.g., "12.3M" for 4 chars)

/**
 * Configuration options for displaying numbers to fit within character limits.
 */
export interface DisplayNumberOptions {
  /**
   * Maximum characters in the output string (including unit suffix).
   * Default: 4
   *
   * @example
   * maxLength: 3  // "1k", "99k", "1M"
   * maxLength: 4  // "1.2k", "132M", "999T"
   * maxLength: 6  // "1.234k", "132.4M"
   */
  maxLength?: number;

  /**
   * Unit suffixes for each 10^3 step.
   * Default: ["", "k", "M", "B", "T"]
   */
  units?: string[];

  /**
   * How to handle overflow when number cannot fit within maxLength.
   * Default: "compact"
   *
   * @example
   * "truncate": 1500 with maxLength 4 → "999+" (max 3 digits + "+")
   * "compact": 1500 with maxLength 4 → "1.5k" (fits with unit)
   */
  overflowStrategy?: OverflowStrategy;
}

/**
 * Result object containing the displayed number and metadata.
 */
export interface DisplayNumberResult {
  /**
   * The compacted display value ready for UI rendering.
   * @example "1.2k", "132M", "999T+"
   */
  displayValue: string;

  /**
   * The unit suffix that was applied.
   * @example "k", "M", "B", "T"
   */
  unitSuffix: string;

  /**
   * Index of the unit in the units array.
   * @example 0 = "", 1 = "k", 2 = "M", 3 = "B", 4 = "T"
   */
  unitIndex: number;
}
