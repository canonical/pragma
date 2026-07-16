/**
 * The OWL → GraphQL compiler domain: the seven-pass pipeline (compile and
 * its artifact-boot variant), the extraction artifact codec, the per-request
 * context factory, and the compiler API type contracts. The shared vocabulary
 * constants and IR type contracts it builds on live in the shared leaf and are
 * re-exported here for the package's public surface.
 *
 * @module compiler
 */

export type * from "../shared/index.js";
export {
  deserializeExtraction,
  hashSources,
  serializeExtraction,
} from "./artifact.js";
export { default as CompilationError } from "./CompilationError.js";
export { default as compile } from "./compile.js";
export { default as compileFromExtraction } from "./compileFromExtraction.js";
export { ARTIFACT_VERSION } from "./constants.js";
export { default as createContextFactory } from "./createContextFactory.js";
export { default as createStoreQueryFn } from "./createStoreQueryFn.js";
export { pluralize, stripVerbPrefix } from "./nameMap.js";
export type * from "./types.js";
