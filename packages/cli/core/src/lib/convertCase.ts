/**
 * Case conversion utilities for mapping between camelCase parameter names
 * and kebab-case CLI flags.
 *
 * @packageDocumentation
 */

/**
 * Convert a camelCase name to kebab-case.
 *
 * @example
 * convertCamelToKebab("allTiers") // "all-tiers"
 * convertCamelToKebab("format")   // "format"
 */
export function convertCamelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Convert a kebab-case name to camelCase.
 *
 * @example
 * convertKebabToCamel("all-tiers") // "allTiers"
 */
export function convertKebabToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
