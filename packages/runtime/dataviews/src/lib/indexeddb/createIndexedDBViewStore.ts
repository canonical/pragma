import {
  type JsonValue,
  type PreferenceResult,
  type PresentationStore,
  spellTargetKey,
} from "../presentation/index.js";
import type {
  SavedView,
  UnreadableView,
  ViewCreateResult,
  ViewGetResult,
  ViewList,
  ViewRemoveResult,
  ViewStore,
  ViewUpdateResult,
} from "../views/index.js";
import { PINS, PREFERENCES, RECORD_VERSION } from "./constants.js";
import createIndexedDBConnection from "./createIndexedDBConnection.js";
import describeUnreadableRecord from "./describeUnreadableRecord.js";
import isStoredPreference from "./isStoredPreference.js";
import isStoredView from "./isStoredView.js";
import readSavedView from "./readSavedView.js";
import readStoredId from "./readStoredId.js";
import type {
  IndexedDBViewStoreConfig,
  LookedUp,
  Step,
  StoredView,
  Stores,
} from "./types.js";

/**
 * Create a local-first view store over IndexedDB, scoped at construction
 * to one collection and one partition of one application's database. It
 * implements both the view store and the presentation store, so one object
 * may serve a provider's `views` and its `presentation`.
 *
 * View edits are transactional: an update or removal names the revision it
 * was made against, and a stale one is an explicit conflict rather than a
 * silent overwrite — so two tabs editing one view conflict. Presentation
 * preferences are stored one record per key and patched atomically, so two
 * tabs changing different keys both keep their change. Records in a format
 * this store does not know are reported and left untouched, so an older
 * client never destroys a newer one's data.
 *
 * Storage the browser blocks, has no room in, or cannot open rejects with
 * the platform's error as the cause; nothing falls back to memory and
 * claims to persist. Other tabs' writes reach `subscribe` through a
 * BroadcastChannel where the platform has one. Import it explicitly from
 * `@canonical/dataviews-core/indexeddb`.
 *
 * @note Impure by design: building it opens a channel to the other tabs of
 * its scope, and every call is storage I/O through its connection.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createIndexedDBViewStore(
  config: IndexedDBViewStoreConfig,
): ViewStore & PresentationStore {
  const scope = JSON.stringify([config.collection, config.partition]);
  const { transact, read, subscribe, dispose } = createIndexedDBConnection({
    indexedDB: config.indexedDB,
    database: config.database,
    channelName: JSON.stringify([
      "@canonical/dataviews-core",
      config.database,
      scope,
    ]),
  });

  /** Look one view up with its pin, then continue in the same transaction. */
  const lookUp = (
    { views, preferences }: Stores,
    step: Step,
    id: string,
    then: (found: LookedUp) => void,
  ): void => {
    const viewRequest = views.get([scope, id]);
    // Requests in one transaction complete in order: the view is in hand
    // by the time the pin is.
    step(preferences.get([scope, PINS, id]), (pin) => {
      const record = viewRequest.result;
      if (record === undefined) {
        then({ status: "missing" });
        return;
      }
      then(
        isStoredView(record)
          ? {
              status: "found",
              view: readSavedView(record, isStoredPreference(pin)),
              record,
            }
          : { status: "unreadable", reason: describeUnreadableRecord(record) },
      );
    });
  };

  /** Delete one view's pin and its own presentation preferences. */
  const forgetPreferences = (
    { preferences }: Stores,
    step: Step,
    id: string,
  ): void => {
    preferences.delete([scope, PINS, id]);
    step(
      preferences
        .index("target")
        .getAllKeys([scope, spellTargetKey({ view: id })]),
      (keys) => {
        for (const key of keys) {
          preferences.delete(key);
        }
      },
    );
  };

  /**
   * Pin or unpin a view that exists. Either twice is either once, and the
   * second writes nothing.
   */
  const setPin = (id: string, pinned: boolean): Promise<PreferenceResult> =>
    transact<PreferenceResult>("readwrite", ({ views, preferences }, step) => {
      let exists = false;
      const pinRequest = preferences.get([scope, PINS, id]);
      // Requests in one transaction complete in order: the pin is in hand
      // by the time the view is.
      step(views.get([scope, id]), (record) => {
        exists = record !== undefined;
        if (!exists || (pinRequest.result !== undefined) === pinned) {
          return;
        }
        if (pinned) {
          preferences.put({ scope, target: PINS, key: id, value: true });
        } else {
          preferences.delete([scope, PINS, id]);
        }
      });
      return () => ({ status: exists ? "saved" : "missing" });
    });

  /**
   * The moment a write happens, as the store records it.
   *
   * @note Impure: reads the clock.
   */
  const stamp = (): string => new Date().toISOString();

  return {
    list() {
      return read(({ views, preferences }, step) => {
        const viewsRequest = views.index("scope").getAll(scope);
        let listed: ViewList = { views: [], unreadable: [] };
        step(preferences.index("target").getAll([scope, PINS]), (pins) => {
          const pinned = new Set(
            pins.filter(isStoredPreference).map((pin) => pin.key),
          );
          const found: SavedView[] = [];
          const unreadable: UnreadableView[] = [];
          for (const record of viewsRequest.result) {
            if (isStoredView(record)) {
              found.push(readSavedView(record, pinned.has(record.id)));
            } else {
              unreadable.push({
                id: readStoredId(record),
                reason: describeUnreadableRecord(record),
              });
            }
          }
          listed = { views: found, unreadable };
        });
        return () => listed;
      });
    },

    get(id) {
      return read((stores, step) => {
        let found: ViewGetResult = { status: "missing" };
        lookUp(stores, step, id, (looked) => {
          // The stored record stays inside the store.
          found =
            looked.status === "found"
              ? { status: "found", view: looked.view }
              : looked;
        });
        return () => found;
      });
    },

    create(draft) {
      return transact("readwrite", (stores, step) => {
        // Always set by the lookup before the transaction commits.
        let written: ViewCreateResult;
        lookUp(stores, step, draft.id, (found) => {
          if (found.status === "unreadable") {
            written = found;
            return;
          }
          if (found.status === "found") {
            const { view } = found;
            // The same creation arriving again: an earlier attempt landed.
            const replayed =
              view.revision === 1 &&
              view.name === draft.name &&
              view.query === draft.query &&
              JSON.stringify(view.presentation) ===
                JSON.stringify(draft.presentation);
            written = { status: replayed ? "saved" : "conflict", view };
            return;
          }
          const now = stamp();
          const record: StoredView = {
            scope,
            id: draft.id,
            v: RECORD_VERSION,
            name: draft.name,
            query: draft.query,
            presentation: draft.presentation,
            revision: 1,
            createdAt: now,
            updatedAt: now,
          };
          stores.views.put(record);
          written = { status: "saved", view: readSavedView(record, false) };
        });
        return () => written;
      });
    },

    update({ id, revision }, changes) {
      return transact("readwrite", (stores, step) => {
        let written: ViewUpdateResult = { status: "missing" };
        lookUp(stores, step, id, (found) => {
          if (found.status !== "found") {
            written = found;
            return;
          }
          if (found.view.revision !== revision) {
            written = { status: "conflict", view: found.view };
            return;
          }
          // Fields this client does not know are carried over untouched, and
          // so is the arrangement the view was created with.
          const record: StoredView = {
            ...found.record,
            name: changes.name ?? found.view.name,
            query: changes.query ?? found.view.query,
            revision: revision + 1,
            updatedAt: stamp(),
          };
          stores.views.put(record);
          written = {
            status: "saved",
            view: readSavedView(record, found.view.pinned),
          };
        });
        return () => written;
      });
    },

    remove({ id, revision }) {
      return transact("readwrite", (stores, step) => {
        let removal: ViewRemoveResult = { status: "removed" };
        lookUp(stores, step, id, (found) => {
          if (found.status === "unreadable") {
            removal = found;
            return;
          }
          if (found.status === "found") {
            if (found.view.revision !== revision) {
              removal = { status: "conflict", view: found.view };
              return;
            }
            stores.views.delete([scope, id]);
            forgetPreferences(stores, step, id);
          }
          // A view already gone was removed with its preferences.
        });
        return () => removal;
      });
    },

    pin(id) {
      return setPin(id, true);
    },

    unpin(id) {
      return setPin(id, false);
    },

    readPresentation(target) {
      return read(
        ({ preferences }, step) => {
          const presentation: Record<string, JsonValue> = {};
          step(
            preferences.index("target").getAll([scope, spellTargetKey(target)]),
            (records) => {
              for (const record of records.filter(isStoredPreference)) {
                presentation[record.key] = record.value;
              }
            },
          );
          return () => presentation;
        },
        [PREFERENCES],
      );
    },

    patchPresentation(target, patch) {
      const key = spellTargetKey(target);
      const apply = (preferences: Stores["preferences"]): void => {
        for (const [name, value] of Object.entries(patch)) {
          if (value === undefined) {
            preferences.delete([scope, key, name]);
          } else {
            preferences.put({ scope, target: key, key: name, value });
          }
        }
      };
      if (target === "default") {
        // The default arrangement names no view: the preferences alone.
        return transact<PreferenceResult>(
          "readwrite",
          ({ preferences }) => {
            apply(preferences);
            return () => ({ status: "saved" });
          },
          [PREFERENCES],
        );
      }
      return transact<PreferenceResult>(
        "readwrite",
        ({ views, preferences }, step) => {
          let exists = false;
          step(views.get([scope, target.view]), (record) => {
            exists = record !== undefined;
            if (exists) {
              apply(preferences);
            }
          });
          return () => ({ status: exists ? "saved" : "missing" });
        },
      );
    },

    subscribe,
    dispose,
  };
}
