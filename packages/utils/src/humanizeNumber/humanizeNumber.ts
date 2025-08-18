import { clamp } from "../index.js";
import {
  DEFAULT_DECIMALS,
  DEFAULT_MAGNITUDE_BASE,
  DEFAULT_UNITS,
  OVERFLOW_INDICATOR,
} from "./constants.js";
import type { HumanizeNumberOptions, HumanizeResult } from "./types.js";

/**
 * Constrains a numeric value to fit within a specified character limit.
 * Truncates decimals as needed, or returns the maximum representable value if the integer part is too long.
 *
 * @param value The number to constrain
 * @param maxChars Maximum number of characters allowed
 * @returns The constrained number, or NaN if impossible to fit
 */
const enforceMaxChars = (value: number, maxChars: number): number => {
  if (maxChars <= 0) return NaN;

  const valueAsStr = String(value);
  if (valueAsStr.length <= maxChars) return value;

  const [integerPart] = valueAsStr.split(".");

  // If even the integer part is too long, return max representable value (e.g., 999 for 3 chars)
  if (integerPart.length > maxChars) {
    return 10 ** maxChars - 1;
  }

  // Calculate how many decimal places we can fit after an integer + decimal point
  const availableDecimals = maxChars - integerPart.length - 1;
  if (availableDecimals <= 0) return Math.trunc(value);

  // Truncate to fit available decimal places
  const factor = 10 ** availableDecimals;
  return Math.trunc(value * factor) / factor;
};

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
 * Determines whether to use the natural number representation instead of humanized format.
 * Natural number representation is used if it fits within the character limit and is shorter or equal in length to the humanized version of a number.
 *
 * @param intValue The integer value being formatted
 * @param naturalLength Length of the natural string representation
 * @param maxChars Maximum allowed characters
 * @param magnitudeBase The scaling base (typically 1000)
 * @param scaledValue The scaled value for the humanized format
 * @param unit The unit suffix for the humanized format
 * @param unitIndex The unit index for calculating representable value
 * @returns Whether natural representation should be used
 */
const shouldUseNaturalRepresentation = (
  intValue: number,
  naturalLength: number,
  maxChars: number,
  magnitudeBase: number,
  scaledValue: number,
  unit: string,
  unitIndex: number,
): boolean => {
  // Use natural representation if the number is less than the magnitude base and fits within max chars
  if (intValue < magnitudeBase && naturalLength <= maxChars) {
    return true;
  }

  // Use natural representation if it can fit within max chars and is shorter than the humanized version
  if (naturalLength <= maxChars) {
    // Calculate the actual humanized length, only adding +1 if an overflow indicator is actually needed
    const representableValue = scaledValue * magnitudeBase ** unitIndex;
    const needsOverflowIndicator = representableValue < intValue;
    const humanizedLength =
      `${scaledValue}${unit}`.length +
      (needsOverflowIndicator ? OVERFLOW_INDICATOR.length : 0);
    return naturalLength < humanizedLength;
  }

  return false;
};

/**
 * Applies character length constraints to the formatted number.
 *
 * @param intValue The integer value to format
 * @param originalValue The original unmodified value
 * @param maxChars Maximum number of characters allowed
 * @param unitIndex The pre-selected optimal unit index
 * @param scaledValue The `originalValue`, scaled by `magnitudeBase ** unitIndex`
 * @param unit The unit suffix string
 * @param magnitudeBase The scaling base (typically 1000)
 * @returns Formatted result that fits within maxChars
 */
const applyCharacterConstraints = (
  intValue: number,
  originalValue: number,
  maxChars: number,
  unitIndex: number,
  scaledValue: number,
  unit: string,
  magnitudeBase: number,
): HumanizeResult => {
  const naturalLength = String(intValue).length;

  // Check if natural representation should be used
  if (
    shouldUseNaturalRepresentation(
      intValue,
      naturalLength,
      maxChars,
      magnitudeBase,
      scaledValue,
      unit,
      unitIndex,
    )
  ) {
    return {
      displayValue: String(intValue),
      value: originalValue,
      unit: "",
    };
  }

  /**
   * Attempts to fit the number with the specified unit within the character limit.
   * It tries both with and without an overflow indicator ("+")
   * If the number cannot fit within this unit with or without the indicator, it returns null (indicating the number cannot be represented in this unit).
   * @param withOverflowIndicator Whether to include an overflow indicator ("+") if the number is truncated
   * @returns The formatted result if it fits, or null if it cannot fit
   */
  const attemptUnitFit = (
    withOverflowIndicator: boolean,
  ): HumanizeResult | null => {
    const spaceForNumber =
      maxChars -
      unit.length -
      (withOverflowIndicator ? OVERFLOW_INDICATOR.length : 0);
    if (spaceForNumber <= 0) return null;

    const constrainedValue = enforceMaxChars(scaledValue, spaceForNumber);
    if (Number.isNaN(constrainedValue)) return null;

    // Determine if we need to add an overflow indicator
    const representableValue = constrainedValue * magnitudeBase ** unitIndex;
    const needsOverflowIndicator = representableValue < originalValue;

    // Only proceed if the overflow indcator requirement matches our strategy
    if (needsOverflowIndicator !== withOverflowIndicator) return null;

    const display = `${constrainedValue}${unit}${needsOverflowIndicator ? OVERFLOW_INDICATOR : ""}`;
    if (display.length > maxChars) return null;

    return {
      displayValue: display,
      value: originalValue,
      unit,
    };
  };

  // Try the exact fit first, then fallback to a truncated version with an overflow indicator
  const unitFitResult = attemptUnitFit(false) ?? attemptUnitFit(true);
  if (unitFitResult) return unitFitResult;

  // Fallback - we can't fit the number with the unit
  // Use the natural number if it fits
  if (naturalLength <= maxChars) {
    return {
      displayValue: String(intValue),
      value: originalValue,
      unit: "",
    };
  }

  // Truncate the number to fit within maxChars, using an overflow indicator
  const truncated = enforceMaxChars(intValue, maxChars - 1);
  return {
    displayValue: `${truncated}+`,
    value: originalValue,
    unit: "",
  };
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
 * humanizeNumber(123456789, { maxChars: 5 }); // Returns "123M+"
 * humanizeNumber(123456789, { maxChars: 3 }); // Returns "123+"
 */
const humanizeNumber = (
  value: number,
  options?: HumanizeNumberOptions,
): HumanizeResult => {
  const {
    decimals = DEFAULT_DECIMALS,
    units = DEFAULT_UNITS,
    magnitudeBase = DEFAULT_MAGNITUDE_BASE,
    clampOptions,
    maxChars,
  } = options ?? {};

  if (!Number.isFinite(value)) {
    return {
      displayValue: Number.isNaN(value) ? String(value) : "∞",
      value,
      unit: "",
    };
  }

  const intValue = Math.floor(
    clampOptions ? clamp(value, clampOptions.min, clampOptions.max) : value,
  );

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

  // Apply character constraints if specified
  if (maxChars) {
    return applyCharacterConstraints(
      intValue,
      value,
      maxChars,
      unitIndex,
      scaledValue,
      unit,
      magnitudeBase,
    );
  }

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
