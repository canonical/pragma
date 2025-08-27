import {
  clamp,
  humanizeNumberToString,
  type PluralizeOptions,
  pluralize,
} from "@canonical/utils";
import { useMemo } from "react";
import type { UseBadgeProps, UseBadgeResult } from "../types.js";

// Maximum number of characters to display in a badge before applying overflow strategy
const BADGE_MAX_CHARS = 4;
// Maximum natural value that can be displayed in a badge without overflow (e.g., 999 for 3 chars)
const BADGE_MAX_NATURAL_VAL = 10 ** (BADGE_MAX_CHARS - 1) - 1;

/**
 * Generate aria-label for badge values using unit information
 * @param value - The numeric value of the badge
 * @param displayValue - The formatted display value of the badge
 * @param itemOptions - Options for pluralizing the item label - see {@link PluralizeOptions}
 * @returns A string suitable for use as an aria-label, e.g., "5 items", "1 item", "999+ items"
 */
const generateAriaLabel = (
  value: number,
  displayValue: string,
  itemOptions?: PluralizeOptions,
): string => {
  const itemStr = pluralize(value, itemOptions);
  return `${displayValue} ${itemStr}`;
};

/**
 * A hook to manage the logic for formatting a badge's numeric value and generating appropriate aria-labels.
 */
const useBadge = ({
  value,
  overflowStrategy = "truncate",
  itemOptions,
}: UseBadgeProps): UseBadgeResult => {
  const safeValue = useMemo(() => clamp(value, 0), [value]);

  const displayValue: string = useMemo(() => {
    if (overflowStrategy === "compact") {
      return humanizeNumberToString(value, { maxChars: 4 });
    }
    return safeValue > BADGE_MAX_NATURAL_VAL
      ? `${BADGE_MAX_NATURAL_VAL}+`
      : String(safeValue);
  }, [value, safeValue, overflowStrategy]);

  const ariaLabel: string = useMemo(
    () => generateAriaLabel(safeValue, String(displayValue), itemOptions),
    [safeValue, displayValue, itemOptions],
  );

  return useMemo(
    () => ({
      displayValue,
      ariaLabel,
    }),
    [displayValue, ariaLabel],
  );
};

export default useBadge;
