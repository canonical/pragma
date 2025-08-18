import type { PluralizeOptions } from "./types.js";

/**
 * Returns the pluralized form of a word based on the count.
 * @param count - The count to determine singular or plural form.
 * @param options - Options to customize the singular and plural forms. See {@link PluralizeOptions}.
 * @returns The appropriate singular or plural form of the word, based on the `count`.
 * @example
 * pluralize(1) // returns 'item'
 * pluralize(2) // returns 'items'
 * pluralize(3, { singularStem: 'box', pluralSuffix: 'es' }) // returns 'boxes'
 * pluralize(1, { singularStem: 'child', pluralSuffix: 'ren' }) // returns 'child'
 * pluralize(3, { singularStem: 'child', pluralSuffix: 'ren' }) // returns 'children'
 * pluralize(5, { singularStem: 'person', pluralStem: 'people', pluralSuffix: undefined }) // returns 'people'
 */
const pluralize = (count: number, options?: PluralizeOptions): string => {
  options ||= {};
  const { singularStem = "item", pluralStem, pluralSuffix = "s" } = options;

  if (count === 1) {
    return singularStem;
  }

  if (pluralStem) {
    return `${pluralStem}${pluralSuffix}`;
  }

  return `${singularStem}${pluralSuffix}`;
};

export default pluralize;
