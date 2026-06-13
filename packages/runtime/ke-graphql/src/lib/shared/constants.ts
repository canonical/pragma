// =============================================================================
// Shared vocabulary, scalar, and structural constants. These are the
// dependency-free building blocks consumed across domains — standard
// vocabulary IRIs, the XSD → GraphQL scalar table, reserved GraphQL names, and
// the Relay connection arguments. They live here (the shared leaf) rather than
// in the compiler so that the loader, resolver, and TBox domains depend on a
// leaf instead of importing values back from their orchestrator.
//
// Queries use absolute IRIs so they work regardless of which prefixes the
// consumer registered on the store.
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
