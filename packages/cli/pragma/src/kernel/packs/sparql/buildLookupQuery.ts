/**
 * Generated, injection-safe SPARQL lookup queries for a pack story.
 *
 * Pack authors declare *what* names an entity (`by`, optional `type`/`types`)
 * and which properties to read; the query text is generated here so
 * user-supplied names are always escaped SPARQL string literals, and level-gated
 * fields below the active level are excluded from the projection (fetch-gating).
 * Matching on the name is exact and case-insensitive.
 *
 * WHAT an entity's name IS lives in one place — {@link nameBinding} — and every
 * form here uses it: the asserted `by` value, plus, for a lookup that DECLARES
 * `nameFallback: "iri"`, the IRI-derived name its class constraint can vouch
 * for. That single binding is what makes the population a `list` publishes and
 * the population a `lookup` answers to the same population.
 *
 * Every name-addressed resolve is TOTALLY ORDERED before its `LIMIT 1`. A name
 * can recur across tiers, and an unordered `LIMIT 1` hands the tie to the
 * store's enumeration order — a different answer on a different machine, or
 * after a repack. `ORDER BY STR(?uri)` is a total, engine-independent order over
 * a variable that is always bound (`?uri` carries the class constraint, or the
 * `by` triple when the name is not derived), so it needs no unbound-value
 * sentinel. It fixes WHICH answer is arbitrary, not WHETHER: declaring a
 * precedence between tiers is an ontology change, tracked separately.
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
 *
 * `constraint` and `optionals` are handed back SEPARATELY because the `?name`
 * binding has to sit between them: it reads `?uri`, which the class constraint
 * binds, and a SPARQL `BIND` may only name variables already in scope.
 */
function lookupProjection(
  lookup: PackLookup,
  level: string | undefined,
): { header: string; constraint: string; optionals: string } {
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
    constraint: buildTypeConstraint(lookup).trimEnd(),
    optionals,
  };
}

/**
 * The IRI-derived display name, in ONE spelling every relaxed form shares.
 *
 * The local name is everything after the last `#` or `/`, and its dot-separated
 * hierarchy segments are published with slashes — `cs:react.component.props` →
 * `react/component/props`. That is not an invention here: it is the derivation
 * the `standard` list story already performs to PUBLISH a row's name, so this is
 * the same rule read from the other side. Written once, so the name a list hands
 * out and the name a lookup answers to cannot drift apart.
 */
const DERIVED_NAME = 'REPLACE(REPLACE(STR(?uri), "^.*[#/]", ""), "\\\\.", "/")';

/**
 * The `?name` binding shared by every lookup form.
 *
 * By DEFAULT the `by` triple is required, and that is the honest default: `by`
 * is documented as "the property whose value names the entity", so an entity
 * without one has no name, is not addressable, and is not drawn by `sample`.
 * It is also the one thing standing between a typo'd IRI and an empty entity.
 *
 * A story whose `list` SYNTHESIZES a name instead of reading one declares
 * `nameFallback: "iri"`, and then the triple becomes OPTIONAL with
 * {@link DERIVED_NAME} behind it. `standard` is the case that exists: 22 of the
 * 156 live code standards carry a `cs:name`, and the code-standards ontology
 * says so deliberately — it is "an optional human-readable display title" that
 * "never participates in identity". `standard list` published
 * `react/component/tsdoc` while `standard lookup react/component/tsdoc`
 * answered ENTITY_NOT_FOUND with empty suggestions, because the only
 * addressable population was the ~13% carrying an asserted name.
 *
 * INFERRING the fallback from the mere PRESENCE of a class constraint is what
 * this option replaced, and it was over-reach in both directions of the same
 * defect: `token list` requires `ds:tokenId`, so an inferred fallback made a
 * `ds:Token` without one addressable and sampleable under a name `token list`
 * never publishes. The declaration is per story because the list/lookup
 * agreement is per story.
 *
 * The class constraint is still required for the fallback (the schema rejects
 * the pairing, and this guard keeps a statically-compiled story from generating
 * a query with nothing bounding `?uri`): a derived name is only as trustworthy
 * as the class vouching for the entity it came from.
 *
 * One binding then serves the name resolve, the miss-suggestion pool, glob
 * expansion and `sample`'s draw pool alike — every form that decides WHICH
 * entities a name can reach. (The IRI-addressed forms reach an entity without
 * going through a name at all: see {@link iriNameBinding}.)
 */
function nameBinding(lookup: PackLookup): string {
  if (!derivesNames(lookup)) return `  ?uri ${formatTerm(lookup.by)} ?name .`;
  return [
    `  OPTIONAL { ?uri ${formatTerm(lookup.by)} ?byName . }`,
    `  BIND(COALESCE(?byName, ${DERIVED_NAME}) AS ?name)`,
  ].join("\n");
}

/**
 * Whether this lookup names an entity that carries no `by` value.
 *
 * The class constraint is part of the condition, not merely a schema rule the
 * builders trust: without one there is no triple bounding `?uri`, so a derived
 * name would be scanned over the whole graph. The schema rejects the pairing
 * for declared packs; this keeps a statically-compiled story from generating
 * that query.
 */
function derivesNames(lookup: PackLookup): boolean {
  return (
    lookup.nameFallback === "iri" &&
    Boolean(lookup.type ?? lookup.types?.length)
  );
}

/**
 * The `?name` binding for an IRI-ADDRESSED form.
 *
 * An IRI names the entity by itself, so here the `by` value is a LABEL to
 * project, not the thing that identifies it — and the class constraint is
 * already a sufficient existence check. So the triple is OPTIONAL wherever a
 * class vouches for the entity, and `?name` is simply left unbound when there is
 * no label; it is REQUIRED only for a lookup constraining no class, where it is
 * the one thing standing between a typo'd IRI and an empty entity.
 *
 * A story that {@link derivesNames} gets the same COALESCE the name forms use,
 * so an entity reached by IRI reports the name `list` published for it rather
 * than a blank.
 */
function iriNameBinding(lookup: PackLookup): string {
  if (derivesNames(lookup)) return nameBinding(lookup);
  const named = `?uri ${formatTerm(lookup.by)} ?name .`;
  const constrained = Boolean(lookup.type ?? lookup.types?.length);
  return constrained ? `  OPTIONAL { ${named} }` : `  ${named}`;
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
  const { header, constraint, optionals } = lookupProjection(lookup, level);
  return [
    header,
    constraint,
    nameBinding(lookup),
    optionals,
    `  FILTER (LCASE(STR(?name)) = LCASE("${escapeSparqlString(name)}"))`,
    "}",
    "ORDER BY STR(?uri)",
    "LIMIT 1",
  ]
    .filter((line) => line !== "")
    .join("\n");
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
  const { header, constraint, optionals } = lookupProjection(lookup, level);
  return [
    header,
    `  BIND(<${iri}> AS ?uri)`,
    constraint,
    iriNameBinding(lookup),
    optionals,
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
    buildTypeConstraint(lookup).trimEnd(),
    nameBinding(lookup),
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
    buildTypeConstraint(lookup).trimEnd(),
    iriNameBinding(lookup),
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
    buildTypeConstraint(lookup).trimEnd(),
    // Same {@link nameBinding} the resolves use, so the addressable population
    // and the resolvable population are the same population. When they were
    // not, a name a miss-suggestion offered could itself miss, and a glob
    // expanded over a pool the resolve could not answer from.
    nameBinding(lookup),
    "}",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export type { PackExpand };
/** Re-export the active-value helpers the GraphQL document generator shares. */
export { activeExpands, activeFields };
