import { DEFAULT_MAGNITUDE_BASE, DEFAULT_UNITS } from "./constants.js";
import type { HumanizeNumberOptions, HumanizeResult } from "./types.js";

/**
 * Rounds a number using the Badge component's logic.
 * Truncates to 3 characters and applies appropriate units.
 * @param value The value to round
 * @param units Array of unit suffixes
 * @param magnitudeBase The base for scaling
 * @param overflowIndicator Indicator to use when value exceeds maximum displayable value
 * @param unit Current unit index
 * @returns Object with displayValue and unit
 */
const roundAndAddUnit = (
  value: number,
  units: string[],
  magnitudeBase: number,
  overflowIndicator: string,
  unit = 0,
): { displayValue: string; unit: string } => {
  if (value < magnitudeBase) {
    const truncatedValue = Number(value.toString().slice(0, 3));
    return {
      displayValue: `${truncatedValue}${units[unit]}${truncatedValue < value ? overflowIndicator || "" : ""}`,
      unit: units[unit] || "",
    };
  }

  // If the value exceeds the largest unit, cap it at `magnitudeBase - 1` of the largest unit and include the overflow indicator
  if (unit >= units.length - 1) {
    return {
      displayValue: `${magnitudeBase - 1}${units[units.length - 1]}${overflowIndicator || ""}`,
      unit: units[units.length - 1] || "",
    };
  }
  const newValue = value / magnitudeBase;
  return roundAndAddUnit(
    newValue,
    units,
    magnitudeBase,
    overflowIndicator,
    unit + 1,
  );
};

/**
 * Formats a large number into a compact, human-readable string with a unit suffix.
 * This function returns a humanized representation of a number, along with the selected unit and the original value if needed for further processing.
 *
 * @param value The number to format. It is expected to be a finite, non-negative number.
 * @param options Optional configuration for units, humanization type, and display constraints.
 * @returns A formatted string representation of the number (e.g., "1.2k", "15M").
 *
 * @example
 * humanizeNumber(12345); // Returns "12k"
 * humanizeNumber(999999); // Returns "999k"
 */
const humanizeNumber = (
  value: number,
  options?: HumanizeNumberOptions,
): HumanizeResult => {
  const {
    magnitudeBase = DEFAULT_MAGNITUDE_BASE,
    overflowIndicator = "+",
  } = options ?? {};

  let {
      units = DEFAULT_UNITS
  } = options ?? {};

  // If user passes an undefined or empty units array, fallback to [""] to show no unit suffix instead of `undefined`
  if (!units?.length) units = [""];

  // Display non-finite numbers (infinity, NaN) as-is
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

  const result = roundAndAddUnit(
    intValue,
    units,
    magnitudeBase,
    overflowIndicator,
  );

  return {
    displayValue: result.displayValue,
    value,
    unit: result.unit,
  };
};

export default humanizeNumber;
