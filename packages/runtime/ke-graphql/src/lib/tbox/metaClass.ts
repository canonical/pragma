// =============================================================================
// The meta-class: owl:Class as a TBox-local ClassNode value.
//
// OntologyClass implements Node, and Node's contract requires `_meta.type` on
// every node. The honest class of a CLASS is owl:Class — a fact the
// extraction already holds (instanceStats carries owl:Class with the count of
// declared classes). This node is deliberately NEVER inserted into
// ir.classes: an IR entry would make the emitter mint a generated type for
// it, and the meta-class is contract surface, not ontology surface.
//
// The label and comment prose are the OWL vocabulary's own (rdfs:label
// "Class", rdfs:comment "The class of OWL classes." in the published
// owl: namespace document), not an invention of this compiler.
// =============================================================================

import { type ClassNode, OWL } from "../shared/index.js";

/** owl:Class — the rdf:type every declared class carries. */
export const OWL_CLASS = `${OWL}Class`;

/**
 * The `${namespace}:${localName}` convenience spelling of the meta-class,
 * accepted by `ontologyClass(uri:)` exactly as every IR class's prefixed
 * form is.
 */
export const OWL_CLASS_PREFIXED = "owl:Class";

/**
 * The frozen, TBox-local ClassNode for owl:Class. One instance per process:
 * every identity-based check (Node.resolveType's TBox branch, the meta
 * branches of the instances/instanceCount resolvers) compares against this
 * exact object, so it must never be copied or rebuilt per schema.
 */
export const OWL_CLASS_NODE: ClassNode = Object.freeze({
  uri: OWL_CLASS,
  label: "Class",
  definition: "The class of OWL classes.",
  namespace: "owl",
  superclasses: [],
  ancestors: [],
  subclasses: [],
  isAbstract: false,
  embeddable: false,
  ownProperties: [],
  allProperties: [],
});
