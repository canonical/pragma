import { describeSortDirection } from "../../../../utils/index.js";
import type { SortPlacement } from "./types.js";

/** The ordinal suffix of a units digit, where it is not "th". */
const SUFFIXES: Readonly<Record<number, string>> = {
  1: "st",
  2: "nd",
  3: "rd",
};

/** A one-based position as an English ordinal: 1st, 2nd, 3rd, 11th, 22nd. */
const spellOrdinal = (value: number): string => {
  const tens = value % 100;
  const suffix =
    tens >= 11 && tens <= 13 ? "th" : (SUFFIXES[value % 10] ?? "th");
  return `${value}${suffix}`;
};

/**
 * What a sorted header states about its column: the direction, and its
 * precedence once the ordering has more than one term — "ascending", or
 * "descending, 2nd of 3".
 */
export default function describeSortPlacement(
  placement: SortPlacement,
): string {
  const direction = describeSortDirection(placement.direction);
  return placement.count === 1
    ? direction
    : `${direction}, ${spellOrdinal(placement.position)} of ${placement.count}`;
}
