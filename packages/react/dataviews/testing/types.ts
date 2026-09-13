import type {
  Query,
  ReadonlyChannel,
  Source,
  SourceActionRunner,
  SourceCapabilities,
  SourceDelivery,
  SourcePage,
  SourceRefusal,
  SourceRequest,
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
