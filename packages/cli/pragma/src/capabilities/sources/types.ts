/**
 * Data shapes for the `sources` noun — `status` (storeless read) and `update`
 * (the Task that resolves, builds, and points the project at a pack).
 */

/** The `sources status` payload — assembled without booting the store. */
export interface SourcesStatusData {
  readonly cwd: string;
  /**
   * Which pack answers reads, straight from the boot decision: the project's
   * own `built` pack, the distribution's `embedded` snapshot, or none at all.
   */
  readonly store: "embedded" | "built" | "unavailable";
  /** The answering pack's content hash, or null when there is none. */
  readonly contentHash: string | null;
  /** The answering pack's provenance label (manifest `sourceRef`), or null. */
  readonly sourceRef: string | null;
  /** When the answering pack was built (manifest `createdAt`), or null. */
  readonly builtAt: string | null;
  /** Total indexed entity count from the answering pack, or null. */
  readonly entityCount: number | null;
  /** The configured pack declarations, as written in the config. */
  readonly sources: readonly {
    readonly name: string;
    readonly ref: string;
  }[];
}

/** One resolved source in the `sources update` result. */
export interface UpdatedSource {
  readonly name: string;
  readonly resolved: string;
  readonly sourceCount: number;
  /** How many `stories/*.json` files this package contributed to the pack. */
  readonly storyCount: number;
}

/** The `sources update` result payload. */
export interface SourcesUpdateData {
  readonly contentHash: string;
  /** Whether the pack was reused from cache rather than rebuilt. */
  readonly reused: boolean;
  readonly packs: readonly UpdatedSource[];
}
