import { math } from "@canonical/utils";
import { useMemo } from "react";
import type {
  BadgeOverflowStrategy,
  UseBadgeProps,
  UseBadgeResult,
} from "../types.js";

const BADGE_MAX_VAL = 999;

/**
 * Generate aria-label for badge values using unit information
 * @param value - The numeric value of the badge
 * @param displayValue - The formatted display value of the badge
 * @param unit - The unit suffix used (k, M, B, T, etc.)
 * @param overflowStrategy - The overflow strategy - see {@link BadgeOverflowStrategy}
 */
const generateAriaLabel = (
  value: number,
  displayValue: string,
  unit: string,
  overflowStrategy?: BadgeOverflowStrategy,
): string => {
  if (overflowStrategy === "compact") {
    if (value < 1000) {
      return `${value} items exist`;
    }

    // Map units to their word equivalents
    const unitMap: Record<string, string> = {
      k: "thousand",
      M: "million",
      B: "billion",
      T: "trillion",
    };

    const word = unitMap[unit];
    if (word) {
      // Extract numeric part by removing the unit
      const numericPart = displayValue.replace(unit, "");
      return `approximately ${numericPart} ${word} items exist`;
    }

    return `${displayValue} items exist`;
  }

  // Exact precision
  return value <= BADGE_MAX_VAL
    ? `${value} items exist`
    : `more than ${BADGE_MAX_VAL} items exist`;
};

/**
 * A hook to manage the logic for formatting a badge's numeric value and generating appropriate aria-labels.
 */
const useBadge = ({
  value,
  overflowStrategy,
}: UseBadgeProps): UseBadgeResult => {
  return useMemo(() => {
    let safeValue = Math.round(value);

    if (value < 0) {
      console.error(
        "Warning: The value used in the Badge should be positive. Received:",
        value,
      );
      safeValue = 0;
    }

    if (overflowStrategy === "compact" || !Number.isFinite(value)) {
      const { displayValue, unitSuffix } = math.displayNumberWithUnit(
        safeValue,
        { overflowStrategy: overflowStrategy },
      );

      return {
        displayValue,
        ariaLabel: generateAriaLabel(
          safeValue,
          displayValue,
          unitSuffix,
          overflowStrategy,
        ),
      };
    }

    // For undefined precision, cap at BADGE_MAX_VAL and add "+" if value was larger
    const clampedValue = math.clamp(safeValue, undefined, BADGE_MAX_VAL);
    const displayValue =
      safeValue > BADGE_MAX_VAL ? `${clampedValue}+` : clampedValue;

    return {
      displayValue,
      ariaLabel: generateAriaLabel(
        safeValue,
        String(displayValue),
        "",
        overflowStrategy,
      ),
    };
  }, [value, overflowStrategy]);
};

export default useBadge;
