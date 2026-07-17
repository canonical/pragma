/** @module Barrel for ontology helpers. */

export { default as extractLocalName } from "../../shared/extractLocalName.js";
export type { ClassTreeNode } from "./buildClassTree.js";
export {
  default as buildClassTree,
  flattenClassTree,
} from "./buildClassTree.js";
export { default as expandOntologyIris } from "./expandOntologyIris.js";
export { default as findNamespace } from "./findNamespace.js";
export type { RawOntologyClass } from "./queryClasses.js";
export { default as queryClasses } from "./queryClasses.js";
export type { RawOntologyProperty } from "./queryProperties.js";
export { default as queryProperties } from "./queryProperties.js";
export {
  queryConstraints,
  queryInstanceCounts,
  queryOntologyMeta,
  querySampleInstances,
} from "./queryTboxFacts.js";
export { default as resolvePrefix } from "./resolvePrefix.js";
