// =============================================================================
// Hardening defaults. These are the package's production-safety knobs in one
// named place (the hardening domain), not magic numbers scattered through the
// handler and resolvers. The HTTP layer and connection helpers read them;
// consumers can override at their call sites.
// =============================================================================

/**
 * Page size applied to a connection when the client supplies neither `first`
 * nor `last`. A connection must never return an unbounded list — this is the
 * floor of DoS protection.
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Hard ceiling on `first`/`last`. A client asking for more is clamped down to
 * this — it bounds both the hydration cost and the response size regardless
 * of what the client requests.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Default maximum selection-set nesting depth enforced by the HTTP layer's
 * depth-limit rule. High enough to admit the standard introspection query,
 * low enough to reject the unbounded recursion that cyclic types
 * (work → authors → works → authors → …) otherwise allow.
 */
export const DEFAULT_MAX_QUERY_DEPTH = 20;

/**
 * Default maximum entries per process-lifetime loader cache (LRU) when
 * `loaderCache: "process"` is used. Bounds memory: enumerating distinct entity
 * IDs (misses are cached too) can't grow the caches without limit. Evicted
 * entries are simply re-queried — the store is immutable between reloads, so
 * eviction never returns stale data.
 */
export const DEFAULT_PROCESS_CACHE_SIZE = 10_000;
