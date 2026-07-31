/**
 * The TBox domain: the hand-written ontology-browsing schema (Ontology,
 * OntologyClass, ClassProperty, OntologyProperty, EntityMeta) composed into
 * every generated schema alongside the data types.
 *
 * @module tbox
 */

export {
  default as buildTBoxSchema,
  type TBoxSchema,
} from "./buildTBoxSchema.js";
export { OWL_CLASS, OWL_CLASS_NODE } from "./metaClass.js";
