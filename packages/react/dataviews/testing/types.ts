import type { ReadonlyChannel } from "@canonical/dataviews-core";

/** A channel a test publishes on: the read side plus `set`. */
export type FakeChannel<T> = ReadonlyChannel<T> & {
  readonly set: (next: T) => void;
};
