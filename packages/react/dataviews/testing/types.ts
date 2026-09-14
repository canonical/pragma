import type {
  HistoryMode,
  Query,
  QueryLocation,
  ReadonlyChannel,
  SavedView,
  Source,
  SourceActionRunner,
  SourceCapabilities,
  SourceDelivery,
  SourcePage,
  SourceRefusal,
  SourceRequest,
  ViewStore,
} from "@canonical/dataviews-core";

/** A channel a test publishes on: the read side plus `set`. */
export type FakeChannel<T> = ReadonlyChannel<T> & {
  readonly set: (next: T) => void;
};

/** One execution the manual source was asked for, and how to answer it. */
export type ManualCall<TRow extends object> = {
  readonly request: SourceRequest;
  readonly deliver: (delivery: SourceDelivery<TRow>) => void;
  /** How many times this execution's release has been called. */
  releases: number;
};

/** Configuration of one manual source. */
export type ManualSourceConfig<TRow extends object> = {
  /** What the source declares. */
  readonly capabilities: SourceCapabilities;
  /** Refusals the declaration cannot express. */
  readonly refusals?: ((query: Query) => readonly SourceRefusal[]) | undefined;
  /** The action runner, when the declaration names actions. */
  readonly runAction?: SourceActionRunner | undefined;
  /**
   * Answer every execution at once with this page. Left out, the test
   * delivers by hand through `latest().deliver`.
   */
  readonly answer?: ((request: SourceRequest) => SourcePage<TRow>) | undefined;
};

/** A source whose deliveries the test drives by hand. */
export type ManualSource<TRow extends object> = {
  readonly source: Source<TRow>;
  /** Every execution asked for, in order. */
  readonly calls: readonly ManualCall<TRow>[];
  /** The nth execution, or a failure rather than a skipped assertion. */
  readonly callAt: (index: number) => ManualCall<TRow>;
  /** The latest execution, or a failure when none was asked for. */
  readonly latest: () => ManualCall<TRow>;
};

/**
 * One write a recording location received: the parameters, and the history
 * mode the writer asked for — null when it asked for none.
 */
export type RecordedWrite = readonly [string, HistoryMode | null];

/** A location port and the record of what passed through it. */
export type RecordingLocation = {
  readonly location: QueryLocation;
  /** Every write, in order. */
  readonly writes: RecordedWrite[];
  /** What the location read at each notification its subscribers received. */
  readonly notifications: string[];
  /** Move the location from outside the loop, as the browser would. */
  readonly move: (params: string) => void;
};

/** A view store kept in memory, with the ways another tab would change it. */
export type MemoryViewStore = {
  readonly store: ViewStore;
  /** Change a record as another tab would, and tell this one. */
  readonly elsewhere: (id: string, changes: Partial<SavedView>) => void;
  /** Delete a record as another tab would, and tell this one. */
  readonly drop: (id: string) => void;
};
