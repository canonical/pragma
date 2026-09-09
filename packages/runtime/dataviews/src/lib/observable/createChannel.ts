/**
 * One observation channel: the smallest observable unit a binding
 * subscribes to. Keying — one channel per state category — is the wiring
 * discipline of the layer above, so a notification reaches only the
 * consumers of that category.
 */

/** Configuration of one channel. */
export type ChannelConfig<T> = {
  /** Equality guard: a set that equals the current value notifies nobody. */
  readonly equals?: (a: T, b: T) => boolean;
};

/** Handle of one observation channel. */
export type Channel<T> = {
  /** The current snapshot; referentially stable between sets. Values are
   * caller-owned: pass immutable snapshots, since the same reference is
   * handed back out. */
  readonly get: () => T;
  /**
   * Publish the next snapshot. Returns false and notifies nobody when the
   * equality guard says the value did not change; the current reference is
   * kept in that case. Listeners are invoked over a snapshot of the
   * subscription set, in subscription order, after the new value is
   * readable; a listener that throws aborts the remaining publication and
   * the exception propagates to the publisher.
   */
  readonly set: (next: T) => boolean;
  /** Subscribe to later publications; the return value unsubscribes. The
   * subscription set is a set: subscribing one function twice registers it
   * once, and either unsubscribe removes the sole registration. */
  readonly subscribe: (listener: () => void) => () => void;
};

const strictEquals = <T>(a: T, b: T): boolean => a === b;

/**
 * Create an observation channel.
 */
export default function createChannel<T>(
  initial: T,
  config: ChannelConfig<T> = {},
): Channel<T> {
  const equals = config.equals ?? strictEquals;
  const listeners = new Set<() => void>();
  let current = initial;

  return {
    get: () => current,
    set(next: T): boolean {
      if (equals(current, next)) {
        return false;
      }
      current = next;
      for (const listener of [...listeners]) {
        listener();
      }
      return true;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
