import { clamp } from "../index.js";
import {
  DEFAULT_DECIMALS,
  DEFAULT_MAGNITUDE_BASE,
  DEFAULT_UNITS,
} from "./constants.js";
import type { HumanizeNumberOptions, HumanizeResult } from "./types.js";

/**
 * Formats a large number into a compact, human-readable string with a unit suffix.
 * This function returns a humanized representation of a number, along with the selected unit and the original value if needed for further processing.
 * To return only the display value as a string, see {@link humanizeNumberToString}.
 *
 * @param value The number to format. It is expected to be a finite, non-negative number.
 * @param options Optional configuration for decimals and units.
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
    truncateAfter,
    magnitudeBase = DEFAULT_MAGNITUDE_BASE,
    clampOptions,
  } = options ?? {};
  const result: HumanizeResult = {
    displayValue: "",
    value: value,
    unit: "",
  };

  if (!Number.isFinite(value)) {
    console.error("humanizeNumber expects a finite number.");
    return {
      ...result,
      displayValue: Number.isNaN(value) ? String(value) : "∞",
    };
  }

  const intValue = Math.floor(
    clampOptions ? clamp(value, clampOptions.min, clampOptions.max) : value,
  );

  // The value is less than the truncation threshold, return it as is
  if (truncateAfter && intValue < truncateAfter) {
    return {
      ...result,
      displayValue: String(intValue),
    };
  }

  // if the value is zero, return "0" without any unit
  // Otherwise, calling log(0) would result in -Infinity
  // and cause issues with the magnitude calculation.
  if (intValue === 0) {
    return {
      ...result,
      displayValue: "0",
    };
  }

  // Determine the appropriate magnitude and unit
  const magnitude = Math.floor(Math.log(intValue) / Math.log(magnitudeBase));
  let unitIndex = Math.min(magnitude, units.length - 1);

  // Scale the number down
  let scaledValue = intValue / magnitudeBase ** unitIndex;

  // If rounding up pushes the number to the next magnitude (e.g., 999.9k -> 1.0M),
  // we need to adjust the unit and value.
  const roundedForCheck = Number(scaledValue.toFixed(decimals));
  if (roundedForCheck >= magnitudeBase && unitIndex < units.length - 1) {
    scaledValue /= magnitudeBase;
    unitIndex++;
  }

  // Format the final value
  const fixedDecimals = unitIndex === 0 ? 0 : decimals;
  const multiplier = 10 ** fixedDecimals;
  // Truncate the scaled value rather than rounding.
  // Otherwise, the display value might be larger than the original value.
  const finalValue = Math.trunc(scaledValue * multiplier) / multiplier;
  const unit = units[unitIndex] ?? "";

  const representableValue = finalValue * magnitudeBase ** unitIndex;
  // Add a "+" if the final value is less than the original value
  const displayValue = `${finalValue}${unit}${representableValue < value ? "+" : ""}`;

  return {
    ...result,
    displayValue,
    unit,
  };
};

export default humanizeNumber;
