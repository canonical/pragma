// =============================================================================
// Compiler-only constants: the vocabulary IRIs and the artifact version used
// solely inside the seven-pass pipeline. The dependency-free vocabulary base
// shared across domains (namespace IRIs, rdf:type, rdfs:label, the XSD scalar
// table, reserved names, connection args) lives in the shared leaf — imported
// here to derive these compiler-internal IRIs without duplicating literals.
//
// Compiler queries use absolute IRIs so they work regardless of which prefixes
// the consumer registered on the store.
// =============================================================================

import { OWL, RDF, RDFS, SH, SKOS, XSD } from "../shared/index.js";

/** rdf:Property class IRI. */
export const RDF_PROPERTY = `${RDF}Property`;
/** rdf:first list predicate IRI. */
export const RDF_FIRST = `${RDF}first`;
/** rdf:rest list predicate IRI. */
export const RDF_REST = `${RDF}rest`;
/** rdf:nil list terminator IRI. */
export const RDF_NIL = `${RDF}nil`;

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
 * Extraction artifact format version. Bumped on any breaking change to the
 * serialized shape; deserialization rejects mismatched artifacts.
 */
export const ARTIFACT_VERSION = 1;
