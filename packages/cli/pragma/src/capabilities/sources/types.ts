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
  /**
   * The project's own built pack when the boot passed over it — built by an
   * older CLI, in a project that declares no packs of its own, so the embedded
   * snapshot answers instead. `store` is `"embedded"` in that case (it reports
   * which pack ANSWERS, and the snapshot does), and this is how status says the
   * pack is still there and why it is not being read. Null whenever there is
   * nothing passed over, which is every other state.
   */
  readonly ignoredPack: {
    readonly contentHash: string;
    /** The CLI version that built it. */
    readonly builtBy: string;
    readonly builtAt: string;
  } | null;
  /** The configured pack declarations, as written in the config. */
  readonly sources: readonly {
    readonly name: string;
    readonly ref: string;
  }[];
}

/** The `sources reset` result payload. */
export interface SourcesResetData {
  /** Whether a pointer was there to remove (false = nothing was built). */
  readonly removed: boolean;
  /** The content hash the removed pointer named, or null when there was none. */
  readonly contentHash: string | null;
  /**
   * What answers this project's reads now that the pointer is gone — the
   * embedded snapshot, or nothing at all because the project declares its own
   * packs and must build them. Resolved from config in the run body, so the
   * result can say which of the two it left behind instead of guessing.
   */
  readonly answers: "embedded" | "unavailable";
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
