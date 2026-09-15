import spellTargetKey from "./spellTargetKey.js";
import type { JsonValue, PresentationStore, ViewArrangement } from "./types.js";

/** Configuration of one memory presentation store. */
type MemoryPresentationStoreConfig = {
  /**
   * The arrangement a snapshot put back, which the store starts holding at
   * the view it was drawn under, or as the default arrangement; none when
   * left out.
   */
  readonly restored?: ViewArrangement | undefined;
};

/**
 * Create a presentation store in memory: what the provider keeps the
 * arrangement in when the application gives it no store. It honours the
 * whole contract — one record per key, per target; patches applied
 * atomically; its own writes announced before they resolve — and lasts for
 * the session only, which nothing here labels as saved. It knows no views,
 * so a view's target is never `missing` and a removed view's keys are kept
 * until the session ends. It starts holding the arrangement a snapshot put
 * back, at the view it was drawn under or as the default arrangement.
 *
 * @note Impure by design: the store is the memory the preferences live in.
 */
export default function createMemoryPresentationStore(
  config: MemoryPresentationStoreConfig = {},
): PresentationStore {
  const targets = new Map<string, Map<string, JsonValue>>();
  if (config.restored !== undefined) {
    const { view, presentation } = config.restored;
    targets.set(
      spellTargetKey(view === null ? "default" : { view }),
      new Map(Object.entries(presentation)),
    );
  }
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
