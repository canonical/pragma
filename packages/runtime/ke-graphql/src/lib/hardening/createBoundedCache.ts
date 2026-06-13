// =============================================================================
// Bounded LRU for the process-lifetime loader caches. The "process" loaderCache
// mode shares DataLoader caches across requests; without a bound, a client
// enumerating distinct entity IDs (misses are cached too) grows the maps
// without limit. This caps them — past the size limit, inserting evicts the
// least-recently-used key, and an eviction merely re-queries (still correct,
// since the store is immutable between reloads).
// =============================================================================

// Map subclass with LRU eviction. get()/set() refresh recency by re-inserting
// (Map preserves insertion order), so the first key is always the LRU one.
class BoundedCache<K, V> extends Map<K, V> {
  readonly #maxSize: number;

  constructor(maxSize: number) {
    super();
    this.#maxSize = maxSize;
  }

  /** @note Impure — mutates LRU recency order (a read promotes the key to most-recent). */
  get(key: K): V | undefined {
    if (!super.has(key)) {
      return undefined;
    }
    const value = super.get(key) as V;
    super.delete(key);
    super.set(key, value);
    return value;
  }

  set(key: K, value: V): this {
    super.delete(key);
    super.set(key, value);
    if (super.size > this.#maxSize) {
      const lru = super.keys().next().value;
      if (lru !== undefined) {
        super.delete(lru);
      }
    }
    return this;
  }
}

/**
 * Create a bounded, least-recently-used Map: once it exceeds `maxSize`
 * entries, inserting evicts the least-recently-used key; get() and set()
 * refresh recency. Backs the process-lifetime loader caches so "process" mode
 * bounds memory instead of growing without limit.
 */
export default function createBoundedCache<K, V>(maxSize: number): Map<K, V> {
  return new BoundedCache<K, V>(maxSize);
}
