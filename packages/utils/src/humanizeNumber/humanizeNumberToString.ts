import humanizeNumber from "./humanizeNumber.js";
import type { HumanizeNumberOptions } from "./types.js";

/**
 * Converts a number into a human-readable string representation with units.
 * This function is a wrapper around the `humanizeNumber` function that returns only the display value
 * as a string, making it convenient for use in UI components or text displays.
 * @param value The number to be humanized. It should be a finite number.
 * @returns A string representation of the humanized number, e.g., "1.2k", "15M".
 * @param options Optional configuration for humanization, such as number of decimals, units, and truncation settings.
 */
const humanizeNumberToString = (
  value: number,
  options?: HumanizeNumberOptions,
): string => humanizeNumber(value, options).displayValue;

export default humanizeNumberToString;
