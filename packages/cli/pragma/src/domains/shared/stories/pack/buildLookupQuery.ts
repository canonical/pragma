import type {
  StoryPackExpand,
  StoryPackField,
  StoryPackLookup,
} from "./types.js";

/**
 * Build the generated, injection-safe lookup queries for a pack story.
 *
 * Pack authors declare *what* names an entity (`by`, optional `type`/`types`)
 * and which properties to read; the query text is generated here so
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
 * Render the class constraint clause for a lookup: a single `a` triple for
 * `type`, a VALUES-constrained type triple for `types`, or nothing.
 * All terms are validated pack terms, never user input.
 */
function buildTypeConstraint(lookup: StoryPackLookup): string {
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
 * The flat values (fields + sections) active at a disclosure level.
 *
 * A value with no `level` belongs to the base level and is always active;
 * one tagged with a level is active at or above that level. With no
 * disclosure declared (or no level requested) everything is active.
 */
export function activeLookupFields(
  lookup: StoryPackLookup,
  level?: string,
): StoryPackField[] {
  const all = [...(lookup.fields ?? []), ...(lookup.sections ?? [])];
  const levels = lookup.disclosure?.levels ?? [];
  const activeIdx = level ? levels.indexOf(level) : Number.POSITIVE_INFINITY;
  return all.filter(
    (field) => activeIdx >= (field.level ? levels.indexOf(field.level) : 0),
  );
}

/**
 * The expands active at a disclosure level (same gating rule as
 * {@link activeLookupFields}) — below its level an expand is neither
 * fetched nor rendered.
 */
export function activeLookupExpands(
  lookup: StoryPackLookup,
  level?: string,
): StoryPackExpand[] {
  const levels = lookup.disclosure?.levels ?? [];
  const activeIdx = level ? levels.indexOf(level) : Number.POSITIVE_INFINITY;
  return (lookup.expand ?? []).filter(
    (expand) => activeIdx >= (expand.level ? levels.indexOf(expand.level) : 0),
  );
}

/**
 * Build the SELECT retrieving one named entity with its declared fields.
 *
 * @param lookup - The pack's lookup declaration.
 * @param name - User-supplied entity name (escaped here).
 * @param level - Active disclosure level; level-gated fields below it are
 *   excluded from the projection (fetch-gating).
 * @returns SPARQL SELECT text.
 */
export default function buildLookupQuery(
  lookup: StoryPackLookup,
  name: string,
  level?: string,
): string {
  const fields = activeLookupFields(lookup, level);
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
 * Mirrors {@link buildLookupQuery} but binds the already-resolved IRI to
 * `?uri` instead of filtering on the `by` property's value, so absolute
 * IRIs and prefixed names address an entity exactly. Injection-safe by
 * construction: the caller resolves and validates `iri` against the
 * embeddable-IRI shape (no whitespace or `<>"` characters) BEFORE it is
 * interpolated here — raw user input never reaches this function.
 *
 * @param lookup - The pack's lookup declaration.
 * @param iri - A resolved, validated absolute IRI.
 * @returns SPARQL SELECT text.
 */
export function buildLookupByIriQuery(
  lookup: StoryPackLookup,
  iri: string,
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
 * Build the minimal name→URI resolve for a graphql-sourced lookup: the
 * OWL-derived schema has no name-based lookup root, so this SELECT maps the
 * user-supplied name to the entity IRI and everything else comes from the
 * generated GraphQL document. Same injection guarantee as
 * {@link buildLookupQuery}: the name is an escaped literal, all terms are
 * validated pack terms.
 *
 * @param lookup - The pack's lookup declaration.
 * @param name - User-supplied entity name (escaped here).
 * @returns SPARQL SELECT text yielding at most one `{uri, name}` row.
 */
export function buildNameResolveQuery(
  lookup: StoryPackLookup,
  name: string,
): string {
  return [
    "SELECT ?uri ?name WHERE {",
    `  ?uri ${formatTerm(lookup.by)} ?name .`,
    buildTypeConstraint(lookup).trimEnd(),
    `  FILTER (LCASE(STR(?name)) = LCASE("${escapeSparqlString(name)}"))`,
    "}",
    // Names can recur across tiers; LIMIT 1 takes the store's first match
    // (load order), the same tie-break the SPARQL lookup path applies.
    "LIMIT 1",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Build the sub-SELECT retrieving one expand's child rows for a resolved
 * entity.
 *
 * Injection-safe by construction: the only interpolated value is
 * `entityUri`, which is the IRI the base lookup already resolved from the
 * store (never user input), and the relation/properties are validated pack
 * terms. Returns one row per child node, each carrying the declared fields.
 *
 * SPARQL expands are single-hop: nested select entries are rejected at
 * validation for `source: "sparql"`, so every entry here is a plain field.
 *
 * @param expand - The expand declaration.
 * @param entityUri - The resolved entity IRI (from the base lookup's `?uri`).
 * @returns SPARQL SELECT text yielding one row per child node.
 */
export function buildExpandQuery(
  expand: StoryPackExpand,
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

/**
 * Build the SELECT listing all entity names — lookup-miss suggestions.
 *
 * @param lookup - The pack's lookup declaration.
 * @returns SPARQL SELECT text yielding a `?name` per entity.
 */
export function buildLookupNamesQuery(lookup: StoryPackLookup): string {
  return [
    "SELECT ?name WHERE {",
    `  ?uri ${formatTerm(lookup.by)} ?name .`,
    buildTypeConstraint(lookup).trimEnd(),
    "}",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
