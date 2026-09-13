import type { ViewStore } from "../src/lib/views/index.js";
import type { CountingViewStore, CountingViewStoreConfig } from "./types.js";

/**
 * A view store holding nothing that a test counts subscriptions on: what
 * the provider's ref-count tests read to see the views start and stop, and
 * what a test hands a provider that must not read real storage.
 */
export default function createCountingViewStore(
  config: CountingViewStoreConfig = {},
): CountingViewStore {
  const listeners = new Set<() => void>();
  const store: ViewStore = {
    list: async () => ({ views: [], unreadable: [] }),
    get: async () => ({ status: "missing" }),
    create: async () => ({ status: "unreadable", reason: "read-only" }),
    update: async () => ({ status: "missing" }),
    remove: async () => ({ status: "unreadable", reason: "read-only" }),
    pin: async () => ({ status: "missing" }),
    unpin: async () => ({ status: "missing" }),
    readPresentation: async () => ({}),
    patchPresentation: async () => ({ status: "missing" }),
    subscribe(listener) {
      config.onSubscribe?.();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      listeners.clear();
    },
  };
  return {
    store,
    get subscribers() {
      return listeners.size;
    },
  };
}
