/**
 * Validate that a string is safe to use as an IRI in SPARQL `<...>` syntax.
 *
 * Rejects characters that would break out of the angle-bracket IRI context
 * or enable SPARQL injection. This is the IRI counterpart to
 * `escapeSparqlValue` — values get escaped, IRIs get validated.
 *
 * Based on RFC 3987 §2.2 exclusions plus SPARQL-specific characters.
 *
 * @throws Error if the IRI contains unsafe characters.
 */

/**
 * Characters not allowed inside `<IRI>` in SPARQL.
 *
 * From RFC 3987 §2.2 and SPARQL grammar IRIREF production:
 * - `<` `>` — angle brackets (IRI delimiters)
 * - `"` — double quote
 * - `{` `}` — curly braces
 * - `|` — pipe
 * - `\` — backslash
 * - `^` — caret
 * - `` ` `` — backtick
 * - whitespace (space, tab, newline, carriage return)
 */
const UNSAFE_IRI_PATTERN = /[<>"{}|\\^`\s]/;

export default function validateIri(iri: string): void {
  if (UNSAFE_IRI_PATTERN.test(iri)) {
    throw new Error(
      `Invalid IRI: contains characters not allowed in SPARQL <IRI> syntax: ${JSON.stringify(iri)}`,
    );
  }
}
