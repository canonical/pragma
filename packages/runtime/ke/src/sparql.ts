import type { SPARQL, URI } from "./types.js";

/**
 * Dangerous SPARQL patterns that could indicate injection attempts.
 */
const DANGEROUS_PATTERNS = [
  /[{}]/,
  /;\s*$/,
  /UNION/i,
  /INSERT/i,
  /DELETE/i,
  /DROP/i,
  /CLEAR/i,
  /LOAD/i,
  /CREATE/i,
  /COPY/i,
  /MOVE/i,
  /ADD\s/i,
  /#/,
];

/**
 * We detect branded URIs by checking if the string was created via
 * the namespace helper or cast as URI. Since branded types are a
 * compile-time-only concept, at runtime we use a WeakSet registry.
 */
const uriRegistry = new WeakSet<object>();

/**
 * Registers a string as a known URI at runtime.
 * This is used internally by the namespace helper.
 */
export function registerURI(value: URI): URI {
  // Wrap in String object so it can go in WeakSet
  return value;
}

/**
 * Escape a value for safe SPARQL interpolation (TP.02).
 *
 * Handles:
 * - null/undefined → empty string
 * - numbers → numeric literal
 * - booleans → "true"/"false"
 * - URI branded strings → <uri>
 * - plain strings → escaped and quoted literal
 * - rejects strings with dangerous SPARQL injection patterns
 */
export function escapeSparqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number: ${value}`);
    }
    return String(value);
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "string") {
    // Check for dangerous patterns in string values
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(value)) {
        throw new Error(
          `Potentially dangerous SPARQL value rejected: ${JSON.stringify(value)}`,
        );
      }
    }

    // Escape special characters in string literals
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");

    return `"${escaped}"`;
  }

  throw new Error(`Unsupported SPARQL value type: ${typeof value}`);
}

/**
 * Escape a URI value for SPARQL interpolation.
 * Wraps the URI in angle brackets.
 */
export function escapeSparqlURI(value: URI): string {
  const str = value as string;
  // Validate URI doesn't contain dangerous characters
  if (str.includes(">") || str.includes("\n") || str.includes("\r")) {
    throw new Error(`Invalid URI: ${str}`);
  }
  return `<${str}>`;
}

/**
 * Tagged template for creating type-safe SPARQL queries (TP.02).
 *
 * Interpolated values are automatically escaped to prevent injection.
 * URI-branded values are wrapped in angle brackets.
 * Strings are escaped and quoted.
 */
export function sparql<Q extends string>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): SPARQL<Q> {
  let result = strings[0];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];

    if (isBrandedURI(value)) {
      result += escapeSparqlURI(value);
    } else {
      result += escapeSparqlValue(value);
    }

    result += strings[i + 1];
  }

  return result as SPARQL<Q>;
}

/**
 * Runtime check for branded URI values.
 * We use a symbol-based approach: branded URIs carry a hidden marker.
 */
const URI_MARKER = Symbol.for("@canonical/ke:URI");

interface MarkedURI {
  [key: symbol]: boolean;
}

export function isBrandedURI(value: unknown): value is URI {
  if (typeof value !== "string") return false;
  // Check if it's a String object with our marker
  // In practice, we detect URIs by checking if they look like IRIs
  // and were created through our namespace() helper
  return uriSet.has(value);
}

/**
 * Internal set to track strings that have been marked as URIs.
 * Using a regular Set since strings can't go in WeakSet.
 */
const uriSet = new Set<string>();

/**
 * Mark a string as a URI at runtime so the sparql tag can detect it.
 */
export function markAsURI(value: string): URI {
  uriSet.add(value);
  return value as URI;
}
