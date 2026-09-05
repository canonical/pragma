import type { PluralizeOptions } from "./types.js";

/**
 * Returns the pluralized form of a word based on the count.
 * Aligns with Django's verbose_name and verbose_name_plural pattern.
 * @param count - The count to determine singular or plural form.
 * @param options - Options to customize the singular and plural forms. See {@link PluralizeOptions}.
 * @returns The appropriate singular or plural form of the word, based on the `count`.
 * @example
 * pluralize(1) // returns 'item'
 * pluralize(2) // returns 'items'
 * pluralize(1, { singular: 'box', plural: 'boxes' }) // returns 'box'
 * pluralize(3, { singular: 'box', plural: 'boxes' }) // returns 'boxes'
 * pluralize(1, { singular: 'child', plural: 'children' }) // returns 'child'
 * pluralize(3, { singular: 'child', plural: 'children' }) // returns 'children'
 * pluralize(1, { singular: 'person' }) // returns 'person'
 * pluralize(2, { singular: 'person' }) // returns 'persons'
 */
const pluralize = (count: number, options?: PluralizeOptions): string => {
  options ||= {};
  const { singular = "item", plural } = options;

  if (count === 1) {
    return singular;
  }

  // If plural is provided, use it; otherwise default to singular + 's'
  return plural || `${singular}s`;
};

export default pluralize;
