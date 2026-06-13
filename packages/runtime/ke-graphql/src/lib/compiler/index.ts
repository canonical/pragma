/**
 * The OWL → GraphQL compiler domain: the seven-pass pipeline (compile), the
 * per-request context factory, the shared vocabulary constants, and every IR
 * type contract.
 *
 * @module compiler
 */

export { default as CompilationError } from "./CompilationError.js";
export { default as compile } from "./compile.js";
export * from "./constants.js";
export { default as createContextFactory } from "./createContextFactory.js";
export { default as getLocalName } from "./getLocalName.js";
export { default as storeQueryFn } from "./storeQueryFn.js";
export type * from "./types.js";
