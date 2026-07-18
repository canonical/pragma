/**
 * Generated, injection-safe SPARQL lookup queries for a pack story.
 *
 * Pack authors declare *what* names an entity (`by`, optional `type`/`types`)
 * and which properties to read; the query text is generated here so
 * user-supplied names are always escaped SPARQL string literals, and level-gated
 * fields below the active level are excluded from the projection (fetch-gating).
 * Matching on the `by` property is exact and case-insensitive.
 */

import { activeExpands, activeFields } from "../disclosure.js";
import type { PackExpand, PackLookup } from "../types.js";
import { escapeSparqlString, formatTerm } from "./escape.js";

/**
 * The class-constraint clause for a lookup: a single `a` triple for `type`, a
 * VALUES-constrained type triple for `types`, or nothing. All terms are
 * validated pack terms, never user input.
 */
function buildTypeConstraint(lookup: PackLookup): string {
  if (lookup.type) {
    return `  ?uri a ${formatTerm(lookup.type)} .\n`;
  }
  if (lookup.types && lookup.types.length > 0) {
    const values = lookup.types.map(formatTerm).join(" ");
    return `  VALUES ?packType { ${values} }\n  ?uri a ?packType .\n`;
  }
  return "";
}

/**
 * Build the SELECT retrieving one named entity with its declared fields.
 *
 * @param lookup - The pack's lookup declaration.
 * @param name - User-supplied entity name (escaped here).
 * @param level - Active canonical level; gated fields below it are excluded.
 * @returns SPARQL SELECT text.
 */
export function buildLookupQuery(
  lookup: PackLookup,
  name: string,
  level?: string,
): string {
  const fields = activeFields(lookup, level);
  const vars = fields.map((field) => `?${field.name}`).join(" ");
  const optionals = fields
    .map(
      (field) =>
        `  OPTIONAL { ?uri ${formatTerm(field.property)} ?${field.name} . }`,
    )
    .join("\n");
  const typeConstraint = buildTypeConstraint(lookup);

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
 * Build the SELECT retrieving one entity addressed directly by IRI.
 *
 * Binds the already-resolved IRI to `?uri` instead of filtering on the `by`
 * value. Injection-safe by construction: the caller validates `iri` against the
 * embeddable-IRI shape BEFORE it is interpolated here — raw user input never
 * reaches this function.
 */
export function buildLookupByIriQuery(lookup: PackLookup, iri: string): string {
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
    `  BIND(<${iri}> AS ?uri)`,
    `  ?uri ${formatTerm(lookup.by)} ?name .`,
    typeConstraint + optionals,
    "}",
    "LIMIT 1",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Build the minimal name→URI resolve for a graphql-sourced lookup (and the
 * shared entry point for the sparql path's name form): maps the user-supplied
 * name to the entity IRI, everything else comes from the field fetch. The name
 * is an escaped literal; all terms are validated pack terms.
 */
export function buildNameResolveQuery(
  lookup: PackLookup,
  name: string,
): string {
  return [
    "SELECT ?uri ?name WHERE {",
    `  ?uri ${formatTerm(lookup.by)} ?name .`,
    buildTypeConstraint(lookup).trimEnd(),
    `  FILTER (LCASE(STR(?name)) = LCASE("${escapeSparqlString(name)}"))`,
    "}",
    // Names can recur across tiers; LIMIT 1 takes the store's first match.
    "LIMIT 1",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Build the sub-SELECT retrieving one expand's child rows for a resolved entity.
 *
 * Injection-safe: the only interpolated value is `entityUri`, the IRI the base
 * lookup already resolved from the store (never user input); the
 * relation/properties are validated pack terms. SPARQL expands are single-hop,
 * so every select entry here is a plain field.
 */
export function buildExpandQuery(
  expand: PackExpand,
  entityUri: string,
): string {
  const vars = expand.select.map((field) => `?${field.name}`).join(" ");
  const optionals = expand.select
    .map((field) =>
      "property" in field
        ? `  OPTIONAL { ?child ${formatTerm(field.property)} ?${field.name} . }`
        : "",
    )
    .filter((line) => line !== "")
    .join("\n");
  return [
    `SELECT ${vars} WHERE {`,
    `  <${entityUri}> ${formatTerm(expand.relation)} ?child .`,
    optionals,
    "}",
  ].join("\n");
}

/** Build the SELECT listing all entity names — lookup-miss suggestions. */
export function buildLookupNamesQuery(lookup: PackLookup): string {
  return [
    "SELECT ?name WHERE {",
    `  ?uri ${formatTerm(lookup.by)} ?name .`,
    buildTypeConstraint(lookup).trimEnd(),
    "}",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export type { PackExpand };
/** Re-export the active-value helpers the GraphQL document generator shares. */
export { activeExpands, activeFields };
