/** English's plural categories, by the platform's own rules. */
const PLURAL_RULES = new Intl.PluralRules("en");

/**
 * The English form a count takes: `one` where the platform's plural rules
 * select it for the count, `other` for every other count.
 */
export default function choosePlural(
  count: number,
  one: string,
  other: string,
): string {
  return PLURAL_RULES.select(count) === "one" ? one : other;
}
