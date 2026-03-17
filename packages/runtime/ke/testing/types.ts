import type { Plugin, PrefixMap, Store } from "../src/lib/types.js";

/**
 * A named graph source: TTL content assigned to a specific graph URI.
 */
export interface GraphSource {
  /** TTL content to load into this graph. */
  ttl: string;
  /** Named graph URI. */
  graph: string;
}

/**
 * Options for creating a test store.
 */
export interface TestStoreOptions {
  /**
   * TTL content to load into the default graph.
   * Defaults to PEOPLE_TTL. Pass a string or array of strings.
   * These go into the default graph (no named graph assignment).
   */
  ttl?: string | string[];

  /**
   * Named graph sources. Each entry's TTL is loaded into the specified graph.
   * Use alongside `ttl` to test mixed default + named graph scenarios.
   */
  graphs?: GraphSource[];

  /** Plugins to register. */
  plugins?: Plugin[];

  /** Prefix map to register. */
  prefixes?: PrefixMap;

  /** Whether to enable caching. */
  cache?: boolean;
}

/**
 * Result from createTestStore, includes cleanup function.
 */
export interface TestStoreResult {
  store: Store;
  tmpDir: string;
  cleanup: () => void;
}
