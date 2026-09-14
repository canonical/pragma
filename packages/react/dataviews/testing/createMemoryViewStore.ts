import type { SavedView, ViewStore } from "@canonical/dataviews-core";
import { buildStoredView } from "./fixtures.js";
import type { MemoryViewStore } from "./types.js";

/**
 * Create a view store in memory: the contract's outcomes, with none of its
 * storage, so every outcome — a conflict, a deletion elsewhere — can be
 * brought about on cue. Not the shipped store's fallback: that never exists.
 */
export default function createMemoryViewStore(
  seed: readonly SavedView[] = [],
): MemoryViewStore {
  const records = new Map(seed.map((view) => [view.id, view]));
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };
  const store: ViewStore = {
    list: async () => ({ views: [...records.values()], unreadable: [] }),
    get: async (id) => {
      const view = records.get(id);
      return view === undefined
        ? { status: "missing" }
        : { status: "found", view };
    },
    create: async (draft) => {
      const view = buildStoredView({
        id: draft.id,
        name: draft.name,
        query: draft.query,
        presentation: draft.presentation,
      });
      records.set(view.id, view);
      notify();
      return { status: "saved", view };
    },
    update: async ({ id, revision }, changes) => {
      const view = records.get(id);
      if (view === undefined) {
        return { status: "missing" };
      }
      if (view.revision !== revision) {
        return { status: "conflict", view };
      }
      const next = { ...view, ...changes, revision: revision + 1 };
      records.set(id, next);
      notify();
      return { status: "saved", view: next };
    },
    remove: async ({ id, revision }) => {
      const view = records.get(id);
      if (view !== undefined && view.revision !== revision) {
        return { status: "conflict", view };
      }
      records.delete(id);
      notify();
      return { status: "removed" };
    },
    pin: async () => ({ status: "saved" }),
    unpin: async () => ({ status: "saved" }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {},
  };
  /** Change a record as another tab would, and tell this one. */
  const elsewhere = (id: string, changes: Partial<SavedView>): void => {
    const view = records.get(id);
    if (view !== undefined) {
      records.set(id, { ...view, ...changes, revision: view.revision + 1 });
    }
    notify();
  };
  const drop = (id: string): void => {
    records.delete(id);
    notify();
  };
  return { store, elsewhere, drop };
}
