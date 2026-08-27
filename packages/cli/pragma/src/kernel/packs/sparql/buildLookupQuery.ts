/**
 * Generated, injection-safe SPARQL lookup queries for a pack story.
 *
 * Pack authors declare *what* names an entity (`by`, optional `type`/`types`)
 * and which properties to read; the query text is generated here so
 * user-supplied names are always escaped SPARQL string literals, and level-gated
 * fields below the active level are excluded from the projection (fetch-gating).
 * Matching on the `by` property is exact and case-insensitive.
 *
 * Every name-addressed resolve is TOTALLY ORDERED before its `LIMIT 1`. A name
 * can recur across tiers, and an unordered `LIMIT 1` hands the tie to the
 * store's enumeration order — a different answer on a different machine, or
 * after a repack. `ORDER BY STR(?uri)` is a total, engine-independent order over
 * a variable that is always bound (`?uri` carries the `by` triple), so it needs
 * no unbound-value sentinel. It fixes WHICH answer is arbitrary, not WHETHER:
 * declaring a precedence between tiers is an ontology change, tracked separately.
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
 * The gated projection shared by both lookup forms: the `?uri ?name <vars>`
 * SELECT header, the class constraint, and the OPTIONAL field triples, all
 * restricted to the fields active at `level`. The name- and IRI-addressed forms
 * differ ONLY in how `?uri` is bound (a `FILTER` on the escaped name vs a `BIND`
 * of the resolved IRI), so both thread the active level through here and gate
 * identically — an IRI-addressed lookup honours `--detail` just like a name one.
 */
function lookupProjection(
  lookup: PackLookup,
  level: string | undefined,
): { header: string; body: string } {
  const fields = activeFields(lookup, level);
  const vars = fields.map((field) => `?${field.name}`).join(" ");
  const optionals = fields
    .map(
      (field) =>
        `  OPTIONAL { ?uri ${formatTerm(field.property)} ?${field.name} . }`,
    )
    .join("\n");
  return {
    header: `SELECT ?uri ?name${vars.length > 0 ? ` ${vars}` : ""} WHERE {`,
    body: buildTypeConstraint(lookup) + optionals,
  };
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
  const { header, body } = lookupProjection(lookup, level);
  return [
    header,
    `  ?uri ${formatTerm(lookup.by)} ?name .`,
    body,
    `  FILTER (LCASE(STR(?name)) = LCASE("${escapeSparqlString(name)}"))`,
    "}",
    "ORDER BY STR(?uri)",
    "LIMIT 1",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * The `?name` clause for an IRI-addressed form.
 *
 * An IRI names the entity by itself, so the `by` value is a LABEL to project,
 * not the thing that identifies it — and a class constraint is already a
 * sufficient existence check. Requiring the `by` triple here made every entity
 * that carries no name unaddressable by any means at all: 131 of the 144 live
 * code standards have no `cs:name` (their displayed name is synthesized from the
 * IRI by the list story), and shell completion offers their IRIs. So the triple
 * is OPTIONAL wherever a class constraint can vouch for the entity, and
 * REQUIRED only for a lookup that declares no `type`/`types` — where it is the
 * one thing standing between a typo'd IRI and an empty entity.
 */
function iriNameClause(lookup: PackLookup): string {
  const named = `?uri ${formatTerm(lookup.by)} ?name .`;
  const constrained = Boolean(lookup.type ?? lookup.types?.length);
  return constrained ? `  OPTIONAL { ${named} }` : `  ${named}`;
}

/**
 * Build the SELECT retrieving one entity addressed directly by IRI.
 *
 * Binds the already-resolved IRI to `?uri` instead of filtering on the `by`
 * value; otherwise identical to the name form, including level-gating. Injection-
 * safe by construction: the caller validates `iri` against the embeddable-IRI
 * shape BEFORE it is interpolated here — raw user input never reaches this
 * function.
 *
 * @param lookup - The pack's lookup declaration.
 * @param iri - The already-resolved, embeddable entity IRI.
 * @param level - Active canonical level; gated fields below it are excluded.
 */
export function buildLookupByIriQuery(
  lookup: PackLookup,
  iri: string,
  level?: string,
): string {
  const { header, body } = lookupProjection(lookup, level);
  return [
    header,
    `  BIND(<${iri}> AS ?uri)`,
    iriNameClause(lookup),
    body,
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
    "ORDER BY STR(?uri)",
    "LIMIT 1",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Build the minimal IRI→entity resolve for a graphql-sourced lookup: the mirror
 * of {@link buildNameResolveQuery} for the other argument shape.
 *
 * The GraphQL lane fetches by IRI, so this exists to ANSWER ONE QUESTION — does
 * the pack's class constraint vouch for this entity? — and to pick up a display
 * name if there is one. Injection-safe by construction: `iri` is already
 * resolved and validated against the embeddable-IRI shape by the caller.
 */
export function buildIriResolveQuery(lookup: PackLookup, iri: string): string {
  return [
    "SELECT ?uri ?name WHERE {",
    `  BIND(<${iri}> AS ?uri)`,
    iriNameClause(lookup),
    buildTypeConstraint(lookup).trimEnd(),
    "}",
    "LIMIT 1",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** Build the SELECT listing every entity IRI a lookup can address (IRI globs). */
export function buildLookupIrisQuery(lookup: PackLookup): string {
  const constraint = buildTypeConstraint(lookup).trimEnd();
  return [
    "SELECT DISTINCT ?uri WHERE {",
    // A pack that constrains by class is asking about its class; one that does
    // not has only the `by` triple to bound the scan, so it keeps that bound
    // (and, like the name population, addresses only entities that carry one).
    constraint !== "" ? constraint : `  ?uri ${formatTerm(lookup.by)} ?name .`,
    "}",
    "ORDER BY STR(?uri)",
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
    // DISTINCT: this population feeds miss-suggestions and glob expansion, and
    // a name that several entities share is one CANDIDATE, not several. Without
    // it a glob matching such a name expanded to it once per entity carrying
    // it, and `lookup` then resolved each copy to the same winner — so
    // `block lookup 'Butt*'` listed one Button twice while the other Button
    // never appeared at all.
    "SELECT DISTINCT ?name WHERE {",
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
