/**
 * Data shapes for the `sources` noun — `status` (storeless read) and `update`
 * (the Task that resolves, builds, and locks the store).
 */

/** How a configured source stands relative to the lock and the pack cache. */
export type SourceStaleness = "up-to-date" | "config-drift" | "uncached";

/** One configured source's status. */
export interface SourceStatusEntry {
  /** Package name. */
  readonly name: string;
  /** The config `packages` source ref (verbatim). */
  readonly ref: string;
  /** The lock's resolved revision, or null when not locked. */
  readonly resolved: string | null;
  /** Whether the config ref matches the lock and the pack is cached. */
  readonly staleness: SourceStaleness;
}

/** The `sources status` payload — assembled without booting the store. */
export interface SourcesStatusData {
  readonly cwd: string;
  /** Whether a `pragma.lock.json` is present. */
  readonly lockPresent: boolean;
  /** The locked combined-pack content hash, or null. */
  readonly contentHash: string | null;
  /** Whether the locked pack is present in the cache. */
  readonly cached: boolean;
  /** When the cached pack was built (manifest `createdAt`), or null. */
  readonly builtAt: string | null;
  /** Total indexed entity count from the cached pack, or null. */
  readonly entityCount: number | null;
  readonly sources: readonly SourceStatusEntry[];
}

/** One resolved source in the `sources update` result. */
export interface UpdatedSource {
  readonly name: string;
  readonly resolved: string;
  readonly sourceCount: number;
}

/** The `sources update` result payload. */
export interface SourcesUpdateData {
  readonly contentHash: string;
  /** Whether the pack was reused from cache rather than rebuilt. */
  readonly reused: boolean;
  readonly lockPath: string;
  readonly packs: readonly UpdatedSource[];
}
