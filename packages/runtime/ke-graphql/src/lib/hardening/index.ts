/**
 * The hardening domain: the package's production-safety posture in one named
 * place — the IRI-injection guard for SPARQL interpolation, connection
 * page-size clamping, the query-depth validation rule, the bounded loader
 * cache, and production error masking. Defaults live in ./constants; the HTTP
 * handler, the connection helpers, and the context factory consume these so
 * the policy is discoverable and tunable, never a magic number lurking in a
 * resolver.
 *
 * @module hardening
 */

export { default as clampConnectionArgs } from "./clampConnectionArgs.js";
export {
  DEFAULT_MAX_QUERY_DEPTH,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PROCESS_CACHE_SIZE,
  MAX_PAGE_SIZE,
} from "./constants.js";
export { default as createBoundedCache } from "./createBoundedCache.js";
export { default as createDepthLimitRule } from "./createDepthLimitRule.js";
export { default as isSafeIri } from "./isSafeIri.js";
export { default as maskError } from "./maskError.js";
