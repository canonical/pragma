import { onTestFinished } from "vitest";
import {
  createIndexedDBViewStore,
  type IndexedDBFactory,
} from "../src/lib/indexeddb/index.js";
import type { PresentationStore } from "../src/lib/presentation/index.js";
import type { ViewStore } from "../src/lib/views/index.js";

/**
 * Open one tab's store over a browser profile's IndexedDB — two stores on
 * one factory are two tabs — disposed when the test that opened it ends,
 * after every observation the test registered later.
 */
export default function openIndexedDBTab(
  indexedDB: IndexedDBFactory,
): ViewStore & PresentationStore {
  const store = createIndexedDBViewStore({
    indexedDB,
    database: "operations-console-views",
    collection: "machines",
    partition: null,
  });
  onTestFinished(store.dispose);
  return store;
}
