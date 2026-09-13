/**
 * One observation channel: the smallest observable unit a binding
 * subscribes to, with the read side a projection hands out kept apart
 * from the write side its publisher keeps.
 */

/**
 * Configuration of one channel.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ChannelConfig<T> = {
  /** Equality guard: a set that equals the current value notifies nobody. */
  readonly equals?: (a: T, b: T) => boolean;
};

/**
 * The read side of one channel: what a projection hands out. Read-only row
 * and cell scopes are projections, not another place to write from, so they
 * publish this rather than the whole handle.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ReadonlyChannel<T> = {
  /** The current snapshot; referentially stable between sets. Values are
   * caller-owned: pass immutable snapshots, since the same reference is
   * handed back out. */
  readonly get: () => T;
  /** Subscribe to later publications; the return value unsubscribes. The
   * subscription set is a set: subscribing one function twice registers it
   * once, and either unsubscribe removes the sole registration. */
  readonly subscribe: (listener: () => void) => () => void;
};

/**
 * Handle of one observation channel: its read side plus publication.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Channel<T> = ReadonlyChannel<T> & {
  /**
   * Publish the next snapshot. Returns false and notifies nobody when the
   * equality guard says the value did not change; the current reference is
   * kept in that case. Listeners are invoked over a snapshot of the
   * subscription set, in subscription order, after the new value is
   * readable; a listener that throws aborts the remaining publication and
   * the exception propagates to the publisher.
   */
  readonly set: (next: T) => boolean;
};
