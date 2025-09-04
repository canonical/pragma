import { clamp } from "../index.js";
import { DEFAULT_MAGNITUDE_BASE, DEFAULT_UNITS } from "./constants.js";
import type { HumanizeNumberOptions, HumanizeResult } from "./types.js";

/**
 * Rounds a number using the Badge component's logic.
 * Truncates to 3 characters and applies appropriate units.
 * @param value The value to round
 * @param units Array of unit suffixes
 * @param magnitudeBase The base for scaling
 * @param unit Current unit index
 * @returns Object with displayValue and unit
 */
const round = (
  value: number,
  units: string[],
  magnitudeBase: number,
  unit = 0,
): { displayValue: string; unit: string } => {
  if (value < magnitudeBase) {
    const truncatedValue = Number(value.toString().slice(0, 3));
    return {
      displayValue: `${truncatedValue}${units[unit]}`,
      unit: units[unit] || "",
    };
  }

  if (unit >= units.length - 1) {
    return {
      displayValue: `999${units[units.length - 1]}`,
      unit: units[units.length - 1] || "",
    };
  }
  const newValue = value / magnitudeBase;
  return round(newValue, units, magnitudeBase, unit + 1);
};

/**
 * Clamps a value to a maximum and returns it with an overflow indicator.
 * @param value The value to clamp
 * @param min The minimum value
 * @param max The maximum value
 * @param overflowIndicator The indicator to append when clamped
 * @returns The clamped value as a string
 */
const clampValue = (
  value: number,
  min?: number,
  max?: number,
  overflowIndicator?: string,
): string => {
  if (max !== undefined && value > max) {
    return `${max}${overflowIndicator || ""}`;
  }
  return clamp(value, min, max).toString();
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
 * humanizeNumber(1500000, { humanizeType: "clamp", clampOptions: { max: 999 } }); // Returns "999+"
 */
const humanizeNumber = (
  value: number,
  options?: HumanizeNumberOptions,
): HumanizeResult => {
  const {
    units = DEFAULT_UNITS,
    magnitudeBase = DEFAULT_MAGNITUDE_BASE,
    humanizeType = "round",
    clampOptions,
    overflowIndicator = "+",
  } = options ?? {};

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

  if (humanizeType === "clamp" && clampOptions) {
    const { min, max } = clampOptions;

    return {
      displayValue: clampValue(intValue, min, max, overflowIndicator),
      value,
      unit: "",
    };
  }

  const result = round(intValue, units, magnitudeBase);

  return {
    displayValue: result.displayValue,
    value,
    unit: result.unit,
  };
};

export default humanizeNumber;
