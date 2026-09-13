import type { Channel, ChannelConfig } from "./types.js";

/**
 * One observation channel: the smallest observable unit a binding
 * subscribes to. Keying — one channel per state category — is the wiring
 * discipline of the layer above, so a notification reaches only the
 * consumers of that category.
 */

const strictEquals = <T>(a: T, b: T): boolean => a === b;

/**
 * Create an observation channel.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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
