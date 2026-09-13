import type { FakeChannel } from "./types.js";

/**
 * The smallest channel a hook test can subscribe to. A set the guard calls
 * equal notifies nobody, as the runtime's channel does, so a test can
 * distinguish a hook that re-renders on publication from one that
 * re-renders on every set.
 */
export default function createFakeChannel<T>(
  initial: T,
  equals: (previous: T, next: T) => boolean = Object.is,
): FakeChannel<T> {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (next) => {
      if (equals(current, next)) {
        return;
      }
      current = next;
      for (const listener of [...listeners]) {
        listener();
      }
    },
  };
}
