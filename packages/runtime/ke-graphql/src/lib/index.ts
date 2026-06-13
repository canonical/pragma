/**
 * The public library surface of @canonical/ke-graphql, composed from the
 * domain barrels. This foundation layer exposes the hardening domain (the
 * SPARQL-injection guard, connection page-size clamp, query-depth rule,
 * bounded loader cache, and production error masking); the compiler, plugin,
 * execution, and connection helpers are layered on top.
 *
 * @module lib
 */

export {
  clampConnectionArgs,
  createDepthLimitRule,
  DEFAULT_MAX_QUERY_DEPTH,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PROCESS_CACHE_SIZE,
  isSafeIri,
  MAX_PAGE_SIZE,
  maskError,
} from "./hardening/index.js";
