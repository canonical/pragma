import spellTargetKey from "./spellTargetKey.js";
import type { JsonValue, PresentationStore } from "./types.js";

/**
 * Create a presentation store in memory: what the provider keeps the
 * arrangement in when the application gives it no store. It honours the
 * whole contract — one record per key, per target; patches applied
 * atomically; its own writes announced before they resolve — and lasts for
 * the session only, which nothing here labels as saved. It knows no views,
 * so a view's target is never `missing` and a removed view's keys are kept
 * until the session ends.
 *
 * @note Impure by design: the store is the memory the preferences live in.
 */
export default function createMemoryPresentationStore(): PresentationStore {
  const targets = new Map<string, Map<string, JsonValue>>();
  const listeners = new Set<() => void>();

  return {
    readPresentation(target) {
      return Promise.resolve(
        Object.fromEntries(targets.get(spellTargetKey(target)) ?? []),
      );
    },
    patchPresentation(target, patch) {
      const key = spellTargetKey(target);
      const entries = targets.get(key) ?? new Map<string, JsonValue>();
      targets.set(key, entries);
      for (const [name, value] of Object.entries(patch)) {
        if (value === undefined) {
          entries.delete(name);
        } else {
          entries.set(name, value);
        }
      }
      for (const listener of listeners) {
        listener();
      }
      return Promise.resolve({ status: "saved" });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
