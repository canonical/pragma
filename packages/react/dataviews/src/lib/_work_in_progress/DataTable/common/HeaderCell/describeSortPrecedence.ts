import { describeSortDirection } from "../../../../utils/index.js";
import type { SortPrecedence } from "./types.js";

/** English's ordinal categories, by the platform's own rules. */
const ORDINAL_RULES = new Intl.PluralRules("en", { type: "ordinal" });

/** The suffix each ordinal category takes. */
const SUFFIXES = {
  zero: "th",
  one: "st",
  two: "nd",
  few: "rd",
  many: "th",
  other: "th",
} as const satisfies Readonly<Record<Intl.LDMLPluralRule, string>>;

/** A one-based position as an English ordinal: 1st, 2nd, 3rd, 11th, 22nd. */
const spellOrdinal = (value: number): string =>
  `${value}${SUFFIXES[ORDINAL_RULES.select(value)]}`;

/**
 * What a sorted header states about its column: the direction, and its
 * precedence once the ordering has more than one term — "ascending", or
 * "descending, 2nd of 3".
 */
export default function describeSortPrecedence(
  precedence: SortPrecedence,
): string {
  const direction = describeSortDirection(precedence.direction);
  return precedence.count === 1
    ? direction
    : `${direction}, ${spellOrdinal(precedence.position)} of ${precedence.count}`;
}
