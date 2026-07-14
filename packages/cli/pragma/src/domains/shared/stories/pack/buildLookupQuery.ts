import type { StoryPackLookup } from "./types.js";

/**
 * Build the generated, injection-safe lookup queries for a pack story.
 *
 * Pack authors declare *what* names an entity (`by`, optional `type`) and
 * which properties to read; the query text is generated here so
 * user-supplied names are always escaped SPARQL string literals — a pack
 * definition never interpolates user input itself. Matching is exact and
 * case-insensitive on the `by` property's string value.
 */

/** Escape a user-supplied value as a SPARQL string literal body. */
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

/**
 * Build the SELECT retrieving one named entity with its declared fields.
 *
 * @param lookup - The pack's lookup declaration.
 * @param name - User-supplied entity name (escaped here).
 * @returns SPARQL SELECT text.
 */
export default function buildLookupQuery(
  lookup: StoryPackLookup,
  name: string,
): string {
  const fields = [...(lookup.fields ?? []), ...(lookup.sections ?? [])];
  const vars = fields.map((field) => `?${field.name}`).join(" ");
  const optionals = fields
    .map(
      (field) =>
        `  OPTIONAL { ?uri ${formatTerm(field.property)} ?${field.name} . }`,
    )
    .join("\n");
  const typeConstraint = lookup.type
    ? `  ?uri a ${formatTerm(lookup.type)} .\n`
    : "";

  return [
    `SELECT ?uri ?name${vars.length > 0 ? ` ${vars}` : ""} WHERE {`,
    `  ?uri ${formatTerm(lookup.by)} ?name .`,
    typeConstraint + optionals,
    `  FILTER (LCASE(STR(?name)) = LCASE("${escapeSparqlString(name)}"))`,
    "}",
    "LIMIT 1",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Build the SELECT listing all entity names — lookup-miss suggestions.
 *
 * @param lookup - The pack's lookup declaration.
 * @returns SPARQL SELECT text yielding a `?name` per entity.
 */
export function buildLookupNamesQuery(lookup: StoryPackLookup): string {
  const typeConstraint = lookup.type
    ? `  ?uri a ${formatTerm(lookup.type)} .\n`
    : "";
  return [
    "SELECT ?name WHERE {",
    `  ?uri ${formatTerm(lookup.by)} ?name .`,
    typeConstraint.trimEnd(),
    "}",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
