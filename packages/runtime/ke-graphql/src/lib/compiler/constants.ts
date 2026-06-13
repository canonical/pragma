// =============================================================================
// Compiler domain constants: standard vocabulary IRIs, scalar mappings, and
// reserved GraphQL names. Compiler queries use absolute IRIs so they work
// regardless of which prefixes the consumer registered on the store.
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
/** rdf:Property class IRI. */
export const RDF_PROPERTY = `${RDF}Property`;
/** rdf:first list predicate IRI. */
export const RDF_FIRST = `${RDF}first`;
/** rdf:rest list predicate IRI. */
export const RDF_REST = `${RDF}rest`;
/** rdf:nil list terminator IRI. */
export const RDF_NIL = `${RDF}nil`;

/** rdfs:label predicate IRI. */
export const RDFS_LABEL = `${RDFS}label`;
/** rdfs:comment predicate IRI. */
export const RDFS_COMMENT = `${RDFS}comment`;
/** rdfs:subClassOf predicate IRI. */
export const RDFS_SUBCLASS_OF = `${RDFS}subClassOf`;
/** rdfs:domain predicate IRI. */
export const RDFS_DOMAIN = `${RDFS}domain`;
/** rdfs:range predicate IRI. */
export const RDFS_RANGE = `${RDFS}range`;
/** rdfs:Datatype class IRI. */
export const RDFS_DATATYPE = `${RDFS}Datatype`;

/** owl:Class class IRI. */
export const OWL_CLASS = `${OWL}Class`;
/** owl:ObjectProperty class IRI. */
export const OWL_OBJECT_PROPERTY = `${OWL}ObjectProperty`;
/** owl:DatatypeProperty class IRI. */
export const OWL_DATATYPE_PROPERTY = `${OWL}DatatypeProperty`;
/** owl:AnnotationProperty class IRI. */
export const OWL_ANNOTATION_PROPERTY = `${OWL}AnnotationProperty`;
/** owl:FunctionalProperty class IRI. */
export const OWL_FUNCTIONAL_PROPERTY = `${OWL}FunctionalProperty`;
/** owl:inverseOf predicate IRI. */
export const OWL_INVERSE_OF = `${OWL}inverseOf`;
/** owl:unionOf predicate IRI. */
export const OWL_UNION_OF = `${OWL}unionOf`;
/** owl:onDatatype predicate IRI (custom datatype restriction base). */
export const OWL_ON_DATATYPE = `${OWL}onDatatype`;
/** owl:withRestrictions predicate IRI (custom datatype facet list). */
export const OWL_WITH_RESTRICTIONS = `${OWL}withRestrictions`;

/** skos:definition predicate IRI. */
export const SKOS_DEFINITION = `${SKOS}definition`;

/** sh:NodeShape class IRI. */
export const SH_NODE_SHAPE = `${SH}NodeShape`;
/** sh:targetClass predicate IRI. */
export const SH_TARGET_CLASS = `${SH}targetClass`;
/** sh:property predicate IRI. */
export const SH_PROPERTY = `${SH}property`;
/** sh:path predicate IRI. */
export const SH_PATH = `${SH}path`;
/** sh:minCount predicate IRI. */
export const SH_MIN_COUNT = `${SH}minCount`;
/** sh:maxCount predicate IRI. */
export const SH_MAX_COUNT = `${SH}maxCount`;
/** sh:or predicate IRI. */
export const SH_OR = `${SH}or`;
/** sh:in predicate IRI. */
export const SH_IN = `${SH}in`;

/** xsd:pattern facet IRI (custom datatype restrictions). */
export const XSD_PATTERN = `${XSD}pattern`;

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

/** Names the compiler owns; generated type names may not take them (§4.4 rule 6). */
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

/** Field names the compiler owns on Node types (§4.4 rule 7). */
export const RESERVED_FIELD_NAMES = new Set([
  "id",
  "uri",
  "_meta",
  "__typename",
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
