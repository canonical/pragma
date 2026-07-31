// =============================================================================
// Shared vocabulary, scalar, and structural constants. These are the
// dependency-free building blocks consumed across domains — standard
// vocabulary IRIs, the XSD → GraphQL scalar table, the reserved type names, and
// the Relay connection/language arguments. They live here (the shared leaf)
// rather than in the compiler so that the loader, resolver, and TBox domains
// depend on a leaf instead of importing values back from their orchestrator.
//
// Queries and identity both use absolute IRIs, so nothing here depends on
// which prefixes the consumer registered on the store.
// =============================================================================

import {
  type GraphQLFieldConfigArgumentMap,
  GraphQLInt,
  GraphQLString,
} from "graphql";

/** RDF syntax namespace IRI. */
export const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
/** RDF Schema namespace IRI. */
export const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
/** OWL namespace IRI. */
export const OWL = "http://www.w3.org/2002/07/owl#";
/** XML Schema datatypes namespace IRI. */
export const XSD = "http://www.w3.org/2001/XMLSchema#";
/** SKOS namespace IRI. */
export const SKOS = "http://www.w3.org/2004/02/skos/core#";
/** SHACL namespace IRI. */
export const SH = "http://www.w3.org/ns/shacl#";

/** rdf:type predicate IRI. */
export const RDF_TYPE = `${RDF}type`;

/** rdfs:label predicate IRI. */
export const RDFS_LABEL = `${RDFS}label`;

/** rdfs:comment predicate IRI. */
export const RDFS_COMMENT = `${RDFS}comment`;

/** skos:prefLabel predicate IRI. */
export const SKOS_PREF_LABEL = `${SKOS}prefLabel`;

/** skos:definition predicate IRI. */
export const SKOS_DEFINITION = `${SKOS}definition`;

/**
 * Local-name fallback tier for `_meta.label` (and, through it, `_meta.title`).
 *
 * Each descriptive field resolves through a FIXED chain: the canonical
 * rdfs/skos predicate first, then — only when the instance asserts none of
 * them — the first of the class's own String properties whose lower-cased OWL
 * local name appears in this table. Matching on the LOCAL name is deliberate:
 * `ds:name`, `cs:name`, and any future `foo:name` all resolve identically, so
 * this package stays provider-neutral and never names a concrete ontology.
 *
 * DESIGNATED FUTURE SEAM — the chain is intentionally fixed and not
 * configurable, because no provider needs to override it today. When one does,
 * the override belongs in the consuming config as a per-object-type annotation
 * naming that type's label/comment/definition predicates — not in the ontology,
 * and not as a flat global predicate map. Adding it later is purely additive:
 * the contract's field NAMES do not change, only the source predicate for a
 * given type.
 */
export const LABEL_LOCAL_NAMES = ["name", "title"];

/** Local-name fallback tier for `_meta.comment`. See LABEL_LOCAL_NAMES. */
export const COMMENT_LOCAL_NAMES = ["summary"];

/** Local-name fallback tier for `_meta.definition`. See LABEL_LOCAL_NAMES. */
export const DEFINITION_LOCAL_NAMES = ["description"];

/**
 * Namespaces that never produce GraphQL types. Loaded in ke for annotation
 * resolution only.
 */
export const STANDARD_NAMESPACES = [RDF, RDFS, OWL, XSD, SKOS, SH];

/**
 * XSD datatype IRI → GraphQL scalar name. Datatypes missing from this map
 * fall back to String (with a custom-datatype diagnostic where applicable).
 */
export const XSD_SCALARS: Record<
  string,
  "String" | "Boolean" | "Int" | "Float"
> = {
  [`${XSD}string`]: "String",
  [`${XSD}boolean`]: "Boolean",
  [`${XSD}integer`]: "Int",
  [`${XSD}int`]: "Int",
  [`${XSD}long`]: "Int",
  [`${XSD}float`]: "Float",
  [`${XSD}double`]: "Float",
  [`${XSD}decimal`]: "Float",
  [`${XSD}anyURI`]: "String",
  [`${XSD}date`]: "String",
  [`${XSD}dateTime`]: "String",
};

/** Names the compiler owns; generated type names may not take them. */
export const RESERVED_TYPE_NAMES = new Set([
  "Node",
  "Query",
  "PageInfo",
  "EntityMeta",
  "ClassProperty",
  "Ontology",
  "OntologyClass",
  "OntologyProperty",
  "PropertyKind",
  // built-in scalars — a class named String would otherwise hit an
  // uncontrolled duplicate-type failure instead of an M004 rename
  "String",
  "Boolean",
  "Int",
  "Float",
  "ID",
]);

/**
 * The four Relay connection pagination arguments (first/after/last/before),
 * shared by every generated connection field and the TBox instances field.
 */
export const CONNECTION_ARGS: GraphQLFieldConfigArgumentMap = {
  first: { type: GraphQLInt },
  after: { type: GraphQLString },
  last: { type: GraphQLInt },
  before: { type: GraphQLString },
};

/**
 * The language tag every descriptive field falls back to when the caller
 * supplies none. It is the ARGUMENT default, not a filter: an untagged literal
 * answers any `lang` (see resolver/descriptive.ts).
 */
export const DEFAULT_LANG = "en";

/**
 * The single `lang` argument carried by every descriptive field on EntityMeta
 * (`title`, `label`, `comment`, `definition`).
 *
 * `default: { value }` — NOT `defaultValue`, which graphql@17.0.0-rc.0
 * deprecates. printSchema renders this as `lang: String = "en"`, and
 * graphql-js coerces the default in, so resolvers always receive a string.
 */
export const LANG_ARGS: GraphQLFieldConfigArgumentMap = {
  lang: { type: GraphQLString, default: { value: DEFAULT_LANG } },
};
