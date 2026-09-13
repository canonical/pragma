/**
 * Test-only shapes: what a manual source records and answers with, and
 * what a counting view store reports. Named here so a test file imports
 * one place for them.
 */

import type { Query } from "../src/lib/query/index.js";
import type {
  SourceDelivery,
  SourcePage,
  SourceRefusal,
} from "../src/lib/result/index.js";
import type { RowRecord } from "../src/lib/rows/index.js";
import type {
  Source,
  SourceActionRunner,
  SourceCapabilities,
  SourceRequest,
} from "../src/lib/source/index.js";
import type { ViewStore } from "../src/lib/views/index.js";

/** One execution the manual source was asked for, and how to answer it. */
export type ManualCall<TRow extends object = RowRecord> = {
  readonly request: SourceRequest;
  readonly deliver: (delivery: SourceDelivery<TRow>) => void;
  /** How many times this execution's release has been called. */
  releases: number;
};

/** Configuration of one manual source. */
export type ManualSourceConfig<TRow extends object = RowRecord> = {
  /** What the source declares; nothing executable by default. */
  readonly capabilities?: SourceCapabilities | undefined;
  /** Refusals the declaration cannot express. */
  readonly refusals?: ((query: Query) => readonly SourceRefusal[]) | undefined;
  /** The action runner, when the declaration names actions. */
  readonly runAction?: SourceActionRunner | undefined;
  /**
   * Answer every execution at once with this page. Left out, the test
   * delivers by hand through `callAt(n).deliver`.
   */
  readonly answer?: ((request: SourceRequest) => SourcePage<TRow>) | undefined;
};

/** A source whose deliveries the test drives by hand. */
export type ManualSource<TRow extends object = RowRecord> = {
  readonly source: Source<TRow>;
  /** Every execution asked for, in order. */
  readonly calls: readonly ManualCall<TRow>[];
  /** The nth execution, or a failure rather than a skipped assertion. */
  readonly callAt: (index: number) => ManualCall<TRow>;
  /** The latest execution, or a failure when none was asked for. */
  readonly latest: () => ManualCall<TRow>;
};

/** A counting store, and the number of listeners it holds. */
export type CountingViewStore = {
  readonly store: ViewStore;
  /** How many listeners the store holds right now. */
  readonly subscribers: number;
};

/** Configuration of one counting store. */
export type CountingViewStoreConfig = {
  /**
   * What `subscribe` does before registering; a throw here is the store
   * refusing to be heard, as storage the browser blocks might.
   */
  readonly onSubscribe?: (() => void) | undefined;
};
