/** English's ordinal categories, by the platform's own rules. */
const ORDINAL_RULES = new Intl.PluralRules("en", { type: "ordinal" });

/** The suffix each ordinal category takes in English. */
const SUFFIXES = {
  zero: "th",
  one: "st",
  two: "nd",
  few: "rd",
  many: "th",
  other: "th",
} as const satisfies Readonly<Record<Intl.LDMLPluralRule, string>>;

/** A one-based position as an English ordinal: 1st, 2nd, 3rd, 11th, 22nd. */
export default function spellOrdinal(value: number): string {
  return `${value}${SUFFIXES[ORDINAL_RULES.select(value)]}`;
}
