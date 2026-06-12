/**
 * The execution domain: in-process query execution with incremental
 * delivery (KG.21), the Relay legacy-format adapter, build-time static
 * extraction (KG.20), and the persisted-query manifest builder (KG.19).
 *
 * @module execution
 */

export type {
  ExtractStaticOptions,
  StaticQuery,
} from "./extractStatic.js";
export { default as extractStatic } from "./extractStatic.js";
export {
  type ExecuteLocalArgs,
  executeLocal,
  isIncrementalResults,
  mergeIncremental,
  relayFormatAdapter,
} from "./incremental.js";
export { createPersistedManifest, sha256Hex } from "./persisted.js";
export type * from "./types.js";
