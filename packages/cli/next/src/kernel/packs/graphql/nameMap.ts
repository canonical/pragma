/**
 * The GraphQL naming rules the pack document generator needs — ported verbatim
 * from ke-graphql's internal `compiler/nameMap` (Pass 4). ke-graphql does not
 * re-export these helpers from its public entry, so they are reimplemented here
 * with the SAME logic to guarantee the derived field names match the names the
 * compiler actually generated. Keeping the port faithful is load-bearing: a
 * divergence would derive a field the schema does not expose.
 */

/** Irregular plurals the suffix rules cannot produce. */
const IRREGULAR_PLURALS: Record<string, string> = {
  child: "children",
  person: "people",
};

/**
 * Pluralize a camelCase field name (matching ke-graphql):
 *   a. irregulars (child → children), preserving a camelCase prefix
 *   b. already ends in 's' → unchanged
 *   c. consonant + 'y' → 'ies'
 *   d. x/z/ch/sh → '+es'
 *   e. default → '+s'
 */
export function pluralize(name: string): string {
  for (const [singular, plural] of Object.entries(IRREGULAR_PLURALS)) {
    if (name.toLowerCase() === singular) {
      return name[0] === name[0]?.toUpperCase()
        ? plural.charAt(0).toUpperCase() + plural.slice(1)
        : plural;
    }
    const suffix = singular.charAt(0).toUpperCase() + singular.slice(1);
    if (name.endsWith(suffix)) {
      return (
        name.slice(0, -suffix.length) +
        plural.charAt(0).toUpperCase() +
        plural.slice(1)
      );
    }
  }
  if (name.endsWith("s")) return name;
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`;
  if (/(x|z|ch|sh)$/i.test(name)) return `${name}es`;
  return `${name}s`;
}

/** Strip a leading `has`/`is` verb from a field name (matching ke-graphql). */
export function stripVerbPrefix(name: string): string {
  for (const prefix of ["has", "is"]) {
    if (
      name.startsWith(prefix) &&
      name.length > prefix.length &&
      name[prefix.length] === name[prefix.length]?.toUpperCase()
    ) {
      const stripped = name.slice(prefix.length);
      return stripped.charAt(0).toLowerCase() + stripped.slice(1);
    }
  }
  return name;
}

/**
 * The schema's page-size clamp for Relay connections. ke-graphql's
 * `MAX_PAGE_SIZE`; stated explicitly on generated connection selections to make
 * the fetched window visible. The schema clamps regardless, so an inlined value
 * only affects the stated bound, never correctness.
 */
export const MAX_PAGE_SIZE = 100;
