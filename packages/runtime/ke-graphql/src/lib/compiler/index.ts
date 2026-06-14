/**
 * The OWL → GraphQL compiler domain. This layer carries the extraction pass
 * (reading the ontology + instance data from the store into a raw extraction)
 * and the OWL→IR build pass, plus the store query adapter and the compiler
 * type contracts. The mapping and emission passes, the seven-pass
 * orchestration, the per-request context factory, and the artifact codec are
 * layered on top.
 *
 * @module compiler
 */

export type * from "#shared";
export { default as createStoreQueryFn } from "./createStoreQueryFn.js";
export type * from "./types.js";
