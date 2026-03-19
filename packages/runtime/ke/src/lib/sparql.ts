// =============================================================================
// @canonical/ke — SPARQL tagged template and injection escaping
//
// This module provides the `sparql` tagged template literal and supporting
// escape functions. It is the primary way to construct SPARQL queries safely.
//
// The core security contract: any value interpolated into a sparql`` template
// is escaped or rejected. You cannot accidentally inject SPARQL keywords,
// graph patterns, or update operations through interpolation.
// =============================================================================

import type { SPARQL, URI } from "./types.js";
import validateIri from "./validateIri.js";

// ---------------------------------------------------------------------------
// Dangerous pattern detection
//
// These regex patterns match SPARQL keywords and syntax that should NEVER
// appear in an interpolated string value. If a user-provided string contains
// any of these, `escapeSparqlValue()` throws rather than attempting to escape.
//
// This is an allowlist-by-exclusion approach: we assume all strings are safe
// EXCEPT those matching known dangerous patterns. This is conservative — it
// will reject some technically safe strings (e.g., a person named "Addison"
// won't match because `ADD\s` requires ADD followed by whitespace).
// ---------------------------------------------------------------------------

const DANGEROUS_PATTERNS = [
  /[{}]/, // Graph pattern delimiters — could close/open WHERE clauses
  /;\s*$/, // Trailing semicolons — could terminate a triple pattern
  /UNION/i, // UNION — could inject alternative graph patterns
  /INSERT/i, // SPARQL Update operations — could mutate the store
  /DELETE/i,
  /DROP/i,
  /CLEAR/i,
  /LOAD/i,
  /CREATE/i,
  /COPY/i,
  /MOVE/i,
  /ADD\s/i, // ADD followed by whitespace (avoids false positives on "Addison")
  /#/, // Comments — could comment out the rest of the query
];

// ---------------------------------------------------------------------------
// URI runtime tracking
//
// Branded types (URI, SPARQL) are compile-time only — at runtime they're just
// strings. But the `sparql` tagged template needs to distinguish URIs from
// plain strings at runtime to decide whether to wrap in <angle brackets> or
// "quotes".
//
// Solution: a module-level Set tracks strings that have been marked as URIs
// via `markAsURI()` (called internally by `createNamespace()`). When the
// tagged template encounters an interpolated value, it checks this Set.
//
// Tradeoff: the Set grows unboundedly. In practice, namespace helpers create
// a finite set of URIs (ontology terms), so this is not a memory concern.
// If it ever becomes one, switch to a WeakRef-based approach.
// ---------------------------------------------------------------------------

/** Internal registry of strings that have been marked as URIs at runtime. */
const uriSet = new Set<string>();

/**
 * Mark a string as a URI at runtime so the `sparql` tagged template can
 * detect it and wrap it in angle brackets instead of quoting it.
 *
 * This is called internally by `createNamespace()`. Most consumers should
 * use `createNamespace()` instead of calling this directly.
 *
 * @example
 * ```ts
 * const uri = markAsURI("http://schema.org/name");
 * const query = sparql`SELECT ?s WHERE { ?s ${uri} ?o }`;
 * // → SELECT ?s WHERE { ?s <http://schema.org/name> ?o }
 * ```
 */
export function markAsURI(value: string): URI {
  uriSet.add(value);
  return value as URI;
}

/**
 * Check whether a value has been marked as a URI at runtime.
 * Used by the `sparql` tagged template to decide escaping strategy.
 */
export function isBrandedURI(value: unknown): value is URI {
  if (typeof value !== "string") return false;
  return uriSet.has(value);
}

// ---------------------------------------------------------------------------
// Escape functions
// ---------------------------------------------------------------------------

/**
 * Escape a value for safe interpolation into a SPARQL query string.
 *
 * This is the core security gate. Every interpolated value in a `sparql``
 * template passes through this function (unless it's a branded URI, which
 * goes through `escapeSparqlURI` instead).
 *
 * Escaping rules:
 * - `null` / `undefined` → `""` (empty string literal)
 * - `number` → numeric literal (e.g., `42`, `3.14`). NaN/Infinity rejected.
 * - `boolean` → `true` / `false`
 * - `string` → quoted and escaped (`"hello"` → `"hello"`). Special chars
 *   (backslash, quotes, newlines, tabs) are backslash-escaped. Strings
 *   matching dangerous patterns are rejected with an error.
 * - anything else → throws (objects, symbols, functions, etc.)
 *
 * @throws If the value contains dangerous SPARQL patterns or is an unsupported type
 */
export function escapeSparqlValue(value: unknown): string {
  // Null/undefined → empty string literal
  if (value === null || value === undefined) {
    return '""';
  }

  // Numbers → numeric literal (reject non-finite)
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number: ${value}`);
    }
    return String(value);
  }

  // Booleans → bare true/false
  if (typeof value === "boolean") {
    return String(value);
  }

  // Strings → escaped and quoted, with dangerous pattern rejection
  if (typeof value === "string") {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(value)) {
        throw new Error(
          `Potentially dangerous SPARQL value rejected: ${JSON.stringify(value)}`,
        );
      }
    }

    // Backslash-escape special characters within the string literal
    const escaped = value
      .replace(/\\/g, "\\\\") // \ → \\
      .replace(/"/g, '\\"') // " → \"
      .replace(/\n/g, "\\n") // newline → \n
      .replace(/\r/g, "\\r") // carriage return → \r
      .replace(/\t/g, "\\t"); // tab → \t

    return `"${escaped}"`;
  }

  throw new Error(`Unsupported SPARQL value type: ${typeof value}`);
}

/**
 * Escape a branded URI for SPARQL interpolation by wrapping in angle brackets.
 *
 * URI values are NOT quoted — they're wrapped in `<...>` per SPARQL syntax.
 * Delegates IRI safety validation to `validateIri` for a single source of
 * truth on disallowed characters.
 *
 * @throws If the URI contains characters not allowed in IRIs
 */
export function escapeSparqlURI(value: URI): string {
  const str = value as string;
  validateIri(str);
  return `<${str}>`;
}

// ---------------------------------------------------------------------------
// Tagged template
// ---------------------------------------------------------------------------

/**
 * Tagged template literal for constructing type-safe SPARQL queries.
 *
 * Every interpolated value is automatically escaped to prevent injection:
 * - Branded URIs (from `createNamespace()`) → `<http://example.org/name>`
 * - Strings → `"escaped value"`
 * - Numbers → `42`
 * - Booleans → `true` / `false`
 * - Dangerous strings → throws an error
 *
 * The return type carries the literal query string as a type parameter,
 * enabling compile-time inference of the result type via `InferQueryResult<Q>`.
 *
 * @example
 * ```ts
 * const ds = createNamespace("https://ds.canonical.com/");
 * const name = "Button";
 * const query = sparql`SELECT ?c WHERE { ?c a ${ds("UIBlock")} ; ds:name ${name} }`;
 * // → SELECT ?c WHERE { ?c a <https://ds.canonical.com/UIBlock> ; ds:name "Button" }
 * //   URIs get <brackets>, strings get "quotes"
 * ```
 */
export function sparql<Q extends string>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): SPARQL<Q> {
  // Build the query by interleaving static string parts with escaped values
  let result = strings[0];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];

    // Branded URIs get angle-bracket wrapping; everything else gets value escaping
    if (isBrandedURI(value)) {
      result += escapeSparqlURI(value);
    } else {
      result += escapeSparqlValue(value);
    }

    // Append the next static string part
    result += strings[i + 1];
  }

  return result as SPARQL<Q>;
}
