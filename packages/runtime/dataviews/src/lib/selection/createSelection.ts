import type { Channel } from "../observable/createChannel.js";
import createChannel from "../observable/createChannel.js";

/** Immutable selection snapshot: an explicit set of record identities. */
export type SelectionState = {
  /** The selected record identities; empty is a valid, documented state.
   * The set is shared by reference between publishes; treat it as
   * read-only, like every snapshot value this package hands out. */
  readonly ids: ReadonlySet<string>;
  /** Bumped on every accepted membership mutation; the selection's version. */
  readonly revision: number;
};

/** Handle of one selection record. */
export type Selection = {
  readonly state: SelectionState;
  /** Observe selection changes; snapshots are immutable between sets. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Toggle one identity. */
  readonly toggle: (id: string) => void;
  /** Replace the selection with the given identities. */
  readonly set: (ids: readonly string[]) => void;
  /** Add identities to the current selection. */
  readonly add: (ids: readonly string[]) => void;
  /** Remove identities from the current selection. */
  readonly remove: (ids: readonly string[]) => void;
  /** Clear the selection to the documented zero-selection state. */
  readonly clear: () => void;
};

const setsEqual = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => {
  if (a.size !== b.size) {
    return false;
  }
  for (const id of a) {
    if (!b.has(id)) {
      return false;
    }
  }
  return true;
};

/**
 * Create one selection record: explicit record identities with a valid
 * empty state. The record owns only the identity set; row data, counts and
 * operations stay with their own owners.
 */
export default function createSelection(
  initial: readonly string[] = [],
): Selection {
  const channel = createChannel<SelectionState>(
    Object.freeze({ ids: new Set(initial), revision: 0 }),
  );

  const publish = (ids: Set<string>): void => {
    const current = channel.get();
    if (setsEqual(current.ids, ids)) {
      return;
    }
    channel.set(Object.freeze({ ids, revision: current.revision + 1 }));
  };

  return {
    get state(): SelectionState {
      return channel.get();
    },
    subscribe: (listener: () => void) => channel.subscribe(listener),
    toggle(id: string): void {
      const next = new Set(channel.get().ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      publish(next);
    },
    set(ids: readonly string[]): void {
      publish(new Set(ids));
    },
    add(ids: readonly string[]): void {
      const next = new Set(channel.get().ids);
      for (const id of ids) {
        next.add(id);
      }
      publish(next);
    },
    remove(ids: readonly string[]): void {
      const next = new Set(channel.get().ids);
      for (const id of ids) {
        next.delete(id);
      }
      publish(next);
    },
    clear(): void {
      publish(new Set());
    },
  };
}
