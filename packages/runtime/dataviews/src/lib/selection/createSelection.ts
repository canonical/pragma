import { createChannel } from "../observable/index.js";
import type { Selection, SelectionState } from "./types.js";

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
    state: channel,
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
