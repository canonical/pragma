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

/**
 * The `graphql:` annotation vocabulary namespace IRI — the transport for
 * annotation-driven binding: an ontology author declares projection intent
 * (names, cardinality, exposure, descriptive sources) on the ontology terms
 * themselves instead of in per-consumer config.
 *
 * PLACEHOLDER IRI (PRA-96 O-1): the value must match the companion's
 * published vocabulary or cross-provider convergence fails — confirm it
 * against that vocabulary package before release. Everything is keyed to
 * this single constant, so the swap is one line.
 */
export const GRAPHQL = "http://pragma.canonical.com/graphql#";

/**
 * The thirteen `graphql:` vocabulary terms this compiler binds (v1).
 * Key = local name, value = absolute term IRI. The extraction probe matches
 * exactly these IRIs; an unrecognized local name in the namespace is
 * captured anyway and diagnosed at resolution (A004).
 */
export const GRAPHQL_TERMS = {
  name: `${GRAPHQL}name`,
  singular: `${GRAPHQL}singular`,
  nonNull: `${GRAPHQL}nonNull`,
  abstract: `${GRAPHQL}abstract`,
  embeddable: `${GRAPHQL}embeddable`,
  inverse: `${GRAPHQL}inverse`,
  titleFrom: `${GRAPHQL}titleFrom`,
  labelFrom: `${GRAPHQL}labelFrom`,
  commentFrom: `${GRAPHQL}commentFrom`,
  definitionFrom: `${GRAPHQL}definitionFrom`,
  prefix: `${GRAPHQL}prefix`,
  expose: `${GRAPHQL}expose`,
  searchable: `${GRAPHQL}searchable`,
} as const;

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
 * Each descriptive field resolves through a FIXED chain: the class's
 * annotated source predicate when the ontology declares one (the
 * `graphql:titleFrom` / `labelFrom` / `commentFrom` / `definitionFrom`
 * annotations — nearest ancestor wins), then the canonical rdfs/skos
 * predicate, then — only when the instance asserts none of them — the first
 * of the class's own String properties whose lower-cased OWL local name
 * appears in this table. Matching on the LOCAL name is deliberate:
 * `ds:name`, `cs:name`, and any future `foo:name` all resolve identically, so
 * this package stays provider-neutral and never names a concrete ontology.
 *
 * The per-type override rides the ONTOLOGY, not the consuming config: the
 * `graphql:*From` annotations declare the source predicate on the term that
 * owns it, so every consumer of that ontology resolves identically (the
 * config-side `standardVocabFields` knob is deprecated in their favor). The
 * override is purely additive — the contract's field NAMES do not change,
 * only the source predicate for a given type — and this table stays the
 * unannotated fallback.
 */
export const LABEL_LOCAL_NAMES = ["name", "title"];

/** Local-name fallback tier for `_meta.comment`. See LABEL_LOCAL_NAMES. */
export const COMMENT_LOCAL_NAMES = ["summary"];

/** Local-name fallback tier for `_meta.definition`. See LABEL_LOCAL_NAMES. */
export const DEFINITION_LOCAL_NAMES = ["description"];

/**
 * Namespaces that never produce GraphQL types. Loaded in ke for annotation
 * resolution only. The graphql: vocabulary is one of them: a consumer who
 * loads its definition TTL gets an inert result (no TBox namespace, no
 * Ontology entry, no diagnostics noise) — and the compiler never requires
 * that TTL to be loaded at all.
 */
export const STANDARD_NAMESPACES = [RDF, RDFS, OWL, XSD, SKOS, SH, GRAPHQL];

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

/**
 * The entity's identity field — its absolute IRI, emitted as `uri: ID!`.
 *
 * This name and STRUCTURAL_META are load-bearing in three places that must
 * agree exactly: Pass 4 protects them from ontology properties (M005), Pass 6
 * injects them onto every container, and Pass 7 declares them on the `Node`
 * interface. Three independent string literals could drift apart silently —
 * the emitted schema would still build, and only `validateSchema` (C003) or a
 * missing `Node` implementation would eventually complain, pointing nowhere
 * near the cause. They are one constant each, consumed everywhere.
 */
export const STRUCTURAL_URI = "uri";

/** The entity's self-description hatch, emitted as `_meta: EntityMeta!`. */
export const STRUCTURAL_META = "_meta";

/**
 * The structural surface of a NON-embeddable container: identity plus
 * self-description. Pass 4 drops an ontology property claiming either one
 * (M005) rather than renaming it.
 */
export const STRUCTURAL_FIELD_NAMES: ReadonlySet<string> = new Set([
  STRUCTURAL_URI,
  STRUCTURAL_META,
]);

/**
 * The structural surface of an EMBEDDABLE container: `_meta` but no `uri` —
 * a blank node has no identity to expose, but it still has a class.
 */
export const EMBEDDABLE_STRUCTURAL_FIELD_NAMES: ReadonlySet<string> = new Set([
  STRUCTURAL_META,
]);

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
 * deprecates. printSchema renders this as `lang: String = "en"`. The default
 * applies only when the argument is OMITTED: an explicit `lang: null` is a
 * legal value for this nullable String and reaches the resolver as null, so
 * the descriptive resolvers normalize null back to DEFAULT_LANG at their
 * boundary rather than crash tag matching.
 */
export const LANG_ARGS: GraphQLFieldConfigArgumentMap = {
  lang: { type: GraphQLString, default: { value: DEFAULT_LANG } },
};
