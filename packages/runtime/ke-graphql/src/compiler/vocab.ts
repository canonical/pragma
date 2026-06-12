// =============================================================================
// Standard vocabulary IRIs. Compiler queries use absolute IRIs so they work
// regardless of which prefixes the consumer registered on the store.
// =============================================================================

export const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
export const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
export const OWL = "http://www.w3.org/2002/07/owl#";
export const XSD = "http://www.w3.org/2001/XMLSchema#";
export const SKOS = "http://www.w3.org/2004/02/skos/core#";
export const SH = "http://www.w3.org/ns/shacl#";

export const RDF_TYPE = `${RDF}type`;
export const RDF_PROPERTY = `${RDF}Property`;
export const RDF_FIRST = `${RDF}first`;
export const RDF_REST = `${RDF}rest`;
export const RDF_NIL = `${RDF}nil`;

export const RDFS_LABEL = `${RDFS}label`;
export const RDFS_COMMENT = `${RDFS}comment`;
export const RDFS_SUBCLASS_OF = `${RDFS}subClassOf`;
export const RDFS_DOMAIN = `${RDFS}domain`;
export const RDFS_RANGE = `${RDFS}range`;
export const RDFS_DATATYPE = `${RDFS}Datatype`;

export const OWL_CLASS = `${OWL}Class`;
export const OWL_OBJECT_PROPERTY = `${OWL}ObjectProperty`;
export const OWL_DATATYPE_PROPERTY = `${OWL}DatatypeProperty`;
export const OWL_ANNOTATION_PROPERTY = `${OWL}AnnotationProperty`;
export const OWL_FUNCTIONAL_PROPERTY = `${OWL}FunctionalProperty`;
export const OWL_INVERSE_OF = `${OWL}inverseOf`;
export const OWL_UNION_OF = `${OWL}unionOf`;
export const OWL_ON_DATATYPE = `${OWL}onDatatype`;
export const OWL_WITH_RESTRICTIONS = `${OWL}withRestrictions`;

export const SKOS_DEFINITION = `${SKOS}definition`;

export const SH_NODE_SHAPE = `${SH}NodeShape`;
export const SH_TARGET_CLASS = `${SH}targetClass`;
export const SH_PROPERTY = `${SH}property`;
export const SH_PATH = `${SH}path`;
export const SH_MIN_COUNT = `${SH}minCount`;
export const SH_MAX_COUNT = `${SH}maxCount`;
export const SH_OR = `${SH}or`;
export const SH_IN = `${SH}in`;

export const XSD_PATTERN = `${XSD}pattern`;

/**
 * Namespaces that never produce GraphQL types. Loaded in ke for annotation
 * resolution only.
 */
export const STANDARD_NAMESPACES = [RDF, RDFS, OWL, XSD, SKOS, SH];

export const isStandardVocab = (uri: string): boolean =>
  STANDARD_NAMESPACES.some((ns) => uri.startsWith(ns));

/** Extract the local name of a URI (after the last '#' or '/'). */
export const localName = (uri: string): string => {
  const hash = uri.lastIndexOf("#");
  const slash = uri.lastIndexOf("/");
  return uri.slice(Math.max(hash, slash) + 1);
};

/** Extract the namespace part of a URI (up to and including '#' or '/'). */
export const namespaceOf = (uri: string): string => {
  const hash = uri.lastIndexOf("#");
  const slash = uri.lastIndexOf("/");
  return uri.slice(0, Math.max(hash, slash) + 1);
};
