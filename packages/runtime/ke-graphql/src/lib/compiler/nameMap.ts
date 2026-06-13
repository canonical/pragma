// =============================================================================
// The GraphQL naming rules: pluralization, casing, verb stripping, and
// name sanitization. Grouped here because Pass 4 applies them together when
// mapping OWL names to GraphQL names.
// =============================================================================

/** Irregular plurals the suffix rules cannot produce. */
const IRREGULAR_PLURALS: Record<string, string> = {
  child: "children",
  person: "people",
};

/**
 * Pluralize a camelCase field name:
 *   a. irregulars (child → children)
 *   b. already ends in 's' → unchanged (treated as plural: cases, donts)
 *   c. consonant + 'y' → 'ies' (category → categories)
 *   d. x/z/ch/sh → '+es' (switch → switches)
 *   e. default → '+s' (edge → edges)
 */
export const pluralize = (name: string): string => {
  // Preserve a camelCase prefix when the final word is irregular
  // (hasChild → child; implementationChild → implementationChildren).
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
  if (name.endsWith("s")) {
    return name;
  }
  if (/[^aeiou]y$/i.test(name)) {
    return `${name.slice(0, -1)}ies`;
  }
  if (/(x|z|ch|sh)$/i.test(name)) {
    return `${name}es`;
  }
  return `${name}s`;
};

/** Camelize a PascalCase type name (lowercase first letter) for root query fields. */
export const camelize = (name: string): string =>
  name.charAt(0).toLowerCase() + name.slice(1);

/** Strip a leading "has"/"is" verb from a field name. */
export const stripVerbPrefix = (name: string): string => {
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
};

/**
 * Make a string a legal GraphQL name: [_a-zA-Z][_a-zA-Z0-9]*.
 * Invalid characters (dots, dashes, unicode) become underscores; a leading
 * digit gets an underscore prefix; an empty result becomes "_". Callers emit
 * a diagnostic when the result differs from the input.
 */
export const sanitizeGraphQLName = (name: string): string => {
  const cleaned = name.replace(/[^_a-zA-Z0-9]/g, "_");
  if (cleaned.length === 0) {
    return "_";
  }
  return /^[_a-zA-Z]/.test(cleaned) ? cleaned : `_${cleaned}`;
};
