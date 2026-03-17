// =============================================================================
// @canonical/ke — Namespace helper for typed URI construction
//
// Creates a reusable function that produces branded URI values from a
// namespace prefix. This is the primary way to create URI values for use
// in SPARQL query interpolation.
//
// The returned function concatenates the namespace IRI with a local term
// name and marks the result as a URI at runtime (via markAsURI), so the
// `sparql` tagged template wraps it in <angle brackets> instead of "quotes".
//
// This follows the const ontology term pattern — define your
// namespaces once, then use them throughout your queries.
// =============================================================================

import { markAsURI } from "./sparql.js";
import type { URI } from "./types.js";

/**
 * Create a namespace helper that produces branded URI terms.
 *
 * The returned function takes a local term name and returns a full URI
 * that is recognized by the `sparql` tagged template as a URI (wrapped
 * in angle brackets, not quoted as a string literal).
 *
 * @param ns - The full namespace IRI, including the trailing `/` or `#`
 * @returns A function that takes a local name and returns a branded URI
 *
 * @example
 * ```ts
 * // Define namespace helpers (typically at module level)
 * const ds = createNamespace("https://ds.canonical.com/");
 * const schema = createNamespace("http://schema.org/");
 *
 * // Use in queries — URIs get <brackets>, not "quotes"
 * const query = sparql`SELECT ?name WHERE {
 *   ?c a ${ds("UIBlock")} ;
 *      ${schema("name")} ?name
 * }`;
 * // → SELECT ?name WHERE {
 * //     ?c a <https://ds.canonical.com/UIBlock> ;
 * //        <http://schema.org/name> ?name
 * //   }
 *
 * // Also useful for building IRIs programmatically
 * const buttonURI = ds("component.button"); // URI: "https://ds.canonical.com/component.button"
 * ```
 */
export default function createNamespace<NS extends string>(
  ns: NS,
): <T extends string>(term: T) => URI {
  return <T extends string>(term: T): URI => {
    return markAsURI(`${ns}${term}`);
  };
}
