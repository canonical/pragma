/**
 * The OWL → GraphQL compiler domain: the seven-pass pipeline (compile and
 * its artifact-boot variant), the extraction artifact codec, the per-request
 * context factory, the shared vocabulary constants, and every IR type
 * contract.
 *
 * @module compiler
 */

export {
  deserializeExtraction,
  hashSources,
  serializeExtraction,
} from "./artifact.js";
export { default as CompilationError } from "./CompilationError.js";
export { default as compile } from "./compile.js";
export { default as compileFromExtraction } from "./compileFromExtraction.js";
export * from "./constants.js";
export { default as createContextFactory } from "./createContextFactory.js";
export { default as getLocalName } from "./getLocalName.js";
export { default as storeQueryFn } from "./storeQueryFn.js";
export type * from "./types.js";
