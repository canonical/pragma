/**
 * Constants for the MCP resource surface.
 *
 * Collects the RDF/RDFS/OWL term URIs, the label/description fallback
 * chains that let foreign ontologies (no `PROPERTY_MAP` entry) still
 * resolve human names, the listing/completion caps, and the client-facing
 * annotation priorities and `_meta` keys used to distinguish TBox schema
 * from ABox individuals.
 */

import { PREFIX_MAP } from "../../domains/shared/prefixes.js";

const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const DCTERMS_NS = "http://purl.org/dc/terms/";
const SCHEMA_NS = "http://schema.org/";

/** `rdf:type` predicate URI. */
export const RDF_TYPE = `${RDF_NS}type`;
/** `rdfs:subClassOf` predicate URI. */
export const RDFS_SUBCLASS_OF = `${PREFIX_MAP.rdfs}subClassOf`;
/** `rdfs:domain` predicate URI. */
export const RDFS_DOMAIN = `${PREFIX_MAP.rdfs}domain`;
/** `rdfs:range` predicate URI. */
export const RDFS_RANGE = `${PREFIX_MAP.rdfs}range`;

/** Class-declaring `rdf:type` objects (TBox class constructs). */
export const CLASS_TYPE_URIS: readonly string[] = [
  `${PREFIX_MAP.owl}Class`,
  `${PREFIX_MAP.rdfs}Class`,
];

/** Property-declaring `rdf:type` objects (TBox property constructs). */
export const PROPERTY_TYPE_URIS: readonly string[] = [
  `${PREFIX_MAP.owl}ObjectProperty`,
  `${PREFIX_MAP.owl}DatatypeProperty`,
  `${PREFIX_MAP.owl}AnnotationProperty`,
  `${RDF_NS}Property`,
];

/**
 * Generic label predicates tried after a namespace's `PROPERTY_MAP` label,
 * in priority order. Lets foreign ontologies resolve a name.
 */
export const LABEL_FALLBACK_URIS: readonly string[] = [
  `${PREFIX_MAP.rdfs}label`,
  `${PREFIX_MAP.skos}prefLabel`,
  `${DCTERMS_NS}title`,
  `${SCHEMA_NS}name`,
];

/**
 * Generic description predicates tried after a namespace's `PROPERTY_MAP`
 * description, in priority order.
 */
export const DESCRIPTION_FALLBACK_URIS: readonly string[] = [
  `${PREFIX_MAP.rdfs}comment`,
  `${DCTERMS_NS}description`,
  `${SCHEMA_NS}description`,
  `${PREFIX_MAP.skos}definition`,
];

/** Maximum individuals listed per class before the remainder is capped. */
export const ABOX_PER_CLASS_LIMIT = 25;

/** Hard ceiling on total individuals across all classes in one listing. */
export const ABOX_TOTAL_LIMIT = 300;

/** Maximum ranked suggestions returned from URI autocomplete. */
export const COMPLETION_LIMIT = 50;

/** Annotation `priority` for TBox classes (highest — schema first). */
export const CLASS_PRIORITY = 1;
/** Annotation `priority` for TBox properties. */
export const PROPERTY_PRIORITY = 0.9;
/** Annotation `priority` for ABox individuals (lowest). */
export const INDIVIDUAL_PRIORITY = 0.5;

/** Separator between the category tag and the entity label in resource names. */
export const NAME_SEPARATOR = " · ";

/** Namespaced `_meta` keys carrying structured box/category metadata. */
export const RESOURCE_META_KEYS = {
  box: "pragma/box",
  category: "pragma/category",
  type: "pragma/type",
  instanceCount: "pragma/instanceCount",
  instancesShown: "pragma/instancesShown",
  truncated: "pragma/truncated",
} as const;
