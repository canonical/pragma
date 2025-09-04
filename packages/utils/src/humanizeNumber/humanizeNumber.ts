import {
  DEFAULT_DECIMALS,
  DEFAULT_MAGNITUDE_BASE,
  DEFAULT_UNITS,
} from "./constants.js";
import type { HumanizeNumberOptions, HumanizeResult } from "./types.js";

/**
 * Determines the optimal unit for a number using natural humanization logic.
 * Prefers units that avoid fractional values less than 1 (e.g., 999k over 0.9M).
 *
 * @param intValue The integer value to find a unit for
 * @param units Array of unit suffixes (e.g., ["", "k", "M", "B", "T"])
 * @param magnitudeBase The base for scaling (typically 1000)
 * @param decimals Number of decimal places to consider for rounding checks
 * @returns Object containing the optimal unit index and scaled value
 */
const selectOptimalUnit = (
  intValue: number,
  units: string[],
  magnitudeBase: number,
  decimals: number,
): { unitIndex: number; scaledValue: number } => {
  /**
   * Scale the value to the appropriate unit
   * The final coefficient will be in the range of [0, magnitudeBase]
   * Scales the number down by powers of `magnitudeBase` until it is less than `magnitudeBase`.
   * This returns a scaled value that uses the smallest possible unit while keeping the value >= 1,
   */
  const magnitude = Math.floor(Math.log(intValue) / Math.log(magnitudeBase));
  let unitIndex = Math.min(magnitude, units.length - 1);
  let scaledValue = intValue / magnitudeBase ** unitIndex;

  // Check if rounding would push us to the next magnitude (e.g., 999.9k → 1.0M)
  const rounded = Number(scaledValue.toFixed(decimals));
  if (rounded >= magnitudeBase && unitIndex < units.length - 1) {
    // if it does, try the next unit
    scaledValue /= magnitudeBase;
    unitIndex++;
  }

  // Prefer units that avoid values < 1 for better readability (e.g., 900k over 0.9M)
  if (scaledValue < 1 && unitIndex > 1) {
    const smallerUnitIndex = unitIndex - 1;
    const smallerScaledValue = intValue / magnitudeBase ** smallerUnitIndex;
    unitIndex = smallerUnitIndex;
    scaledValue = smallerScaledValue;
  }

  return { unitIndex, scaledValue };
};

/**
 * Formats a large number into a compact, human-readable string with a unit suffix.
 * This function returns a humanized representation of a number, along with the selected unit and the original value if needed for further processing.
 * To return only the display value as a string, see {@link humanizeNumberToString}.
 *
 * @param value The number to format. It is expected to be a finite, non-negative number.
 * @param options Optional configuration for decimals, units, and display constraints.
 * @returns A formatted string representation of the number (e.g., "1.2k", "15M").
 *
 * @example
 * humanizeNumber(12345); // Returns "12.3k+"
 * humanizeNumber(999999); // Returns "999.9k+"
 * humanizeNumber(1500000, { decimals: 2 }); // Returns "1.50M"
 */
const humanizeNumber = (
  value: number,
  options?: HumanizeNumberOptions,
): HumanizeResult => {
  const {
    decimals = DEFAULT_DECIMALS,
    units = DEFAULT_UNITS,
    magnitudeBase = DEFAULT_MAGNITUDE_BASE,
  } = options ?? {};

  if (!Number.isFinite(value)) {
    return {
      displayValue: Number.isNaN(value) ? String(value) : "∞",
      value,
      unit: "",
    };
  }

  // Floor the value to get integer part
  const intValue = Math.floor(value);

  if (intValue === 0) {
    return {
      displayValue: "0",
      value,
      unit: "",
    };
  }

  // Select the optimal unit for the value
  const { unitIndex, scaledValue } = selectOptimalUnit(
    intValue,
    units,
    magnitudeBase,
    decimals,
  );
  const unit = units[unitIndex] ?? "";

  // Standard formatting: format with appropriate decimals
  const fixedDecimals = unitIndex === 0 ? 0 : decimals;
  const multiplier = 10 ** fixedDecimals;
  const finalValue = Math.trunc(scaledValue * multiplier) / multiplier;

  // Add "+" if the formatted value represents less than the original
  const representableValue = finalValue * magnitudeBase ** unitIndex;
  const displayValue = `${finalValue}${unit}${representableValue < value ? "+" : ""}`;

  return {
    displayValue,
    value,
    unit,
  };
};

export default humanizeNumber;
