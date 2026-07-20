/**
 * SPARQL literal/term escaping for generated pack queries.
 *
 * Pack authors declare RDF terms (prefixed names or IRIs); users supply entity
 * names. The generators here escape user names as SPARQL string literals and
 * render validated terms as query tokens, so a pack definition never
 * interpolates raw user input into query text.
 */

/** Escape a user-supplied value as a SPARQL string-literal body. */
export function escapeSparqlString(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r");
}

/** Render a validated term (prefixed name or absolute IRI) as a query token. */
export function formatTerm(term: string): string {
  return term.includes("://") ? `<${term}>` : term;
}
