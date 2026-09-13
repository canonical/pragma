/**
 * Story machinery for the machine collection's stories — the table, its
 * filters and its bars: the provider hook every story drives and the
 * saved-view store a story opens. Story-only; the records and sources live
 * in `./fixtures.ts`.
 */

import {
  createDataViewsProvider,
  type DataViewsProvider,
  DEFAULT_WINDOW,
  type QueryLocation,
  type ResultWindow,
  type Slice,
  type Source,
  type ViewDraft,
  type ViewStore,
} from "@canonical/dataviews-core";
import {
  createIndexedDBViewStore,
  type IndexedDBFactory,
} from "@canonical/dataviews-core/indexeddb";
import { useEffect, useState } from "react";
import {
  createMachineSource,
  type Machine,
  type MachineFields,
  machineCollection,
} from "./fixtures.js";

/** The provider every story drives, over the machine collection. */
export type MachineProvider = DataViewsProvider<MachineFields, Machine>;

/** How one story's collection is set up. Read once, when the story mounts. */
export type MachineProviderConfig = {
  /** The source the table reads; every machine by default. */
  readonly source?: (() => Source<Machine>) | undefined;
  /** The slice the provider starts on; nothing filtered or ordered otherwise. */
  readonly slice?: Slice | undefined;
  /** The displayed window; the provider's default page otherwise. */
  readonly window?: Partial<ResultWindow> | undefined;
  /** Commands issued once the provider is built: a sort, a search, a selection. */
  readonly prepare?: ((provider: MachineProvider) => void) | undefined;
  /** Where the applied query lives; in the provider alone by default. */
  readonly location?: QueryLocation | undefined;
  /** Where the collection's saved views live; none by default. */
  readonly views?: ViewStore | undefined;
};

/**
 * A provider over a real source, built the way an application builds one:
 * once, in state, and handed to the parts. Nothing here subscribes — the
 * parts observe the provider from their effects, and the ref-count starts
 * its ports on the first of them and stops them on the last.
 */
export function useMachineProvider({
  source = createMachineSource,
  slice,
  window: resultWindow,
  prepare,
  location,
  views,
}: MachineProviderConfig = {}): MachineProvider {
  const [provider] = useState(() => {
    const built = createDataViewsProvider({
      collection: machineCollection,
      source: source(),
      ...(location === undefined ? {} : { location }),
      ...(views === undefined ? {} : { views }),
      seed:
        slice === undefined && resultWindow === undefined
          ? undefined
          : {
              slice,
              window:
                resultWindow === undefined
                  ? undefined
                  : { ...DEFAULT_WINDOW, ...resultWindow },
            },
    });
    prepare?.(built);
    return built;
  });
  return provider;
}

/** Names a machine for its selection checkbox: by host. */
export const hostName = (row: Machine): string => row.name;

/** A story's saved-view store, and a way to open another tab over it. */
export type StoryViewStore = {
  readonly store: ViewStore;
  readonly openAnotherTab: () => ViewStore;
};

/** How one story's saved-view store is set up. Read once, when it mounts. */
export type StoryViewStoreConfig = {
  /** The views the store holds when the story opens. */
  readonly seed?: readonly ViewDraft[] | undefined;
  /** The browser's IndexedDB by default; a stand-in shows refused storage. */
  readonly indexedDB?: IndexedDBFactory | undefined;
};

/**
 * A saved-view store of the story's own: the browser's IndexedDB, in a
 * database no other story or visit shares, seeded once and deleted when the
 * story unmounts. An application declares one store for its lifetime instead,
 * as the consumer code shows.
 */
export function useStoryViewStore({
  seed = [],
  indexedDB = globalThis.indexedDB,
}: StoryViewStoreConfig = {}): StoryViewStore {
  const [database] = useState(
    () => `dataviews-story-views-${Math.random().toString(36).slice(2)}`,
  );
  const [setUp] = useState(() => {
    const scope = {
      indexedDB,
      database,
      collection: "machines",
      partition: null,
    };
    return {
      store: createIndexedDBViewStore(scope),
      openAnotherTab: () => createIndexedDBViewStore(scope),
      seed,
    };
  });
  useEffect(() => {
    for (const draft of setUp.seed) {
      // Storage the browser refuses is the control's to report.
      setUp.store.create(draft).catch(() => {});
    }
    // The store closes its connection when the database is deleted.
    return () => {
      globalThis.indexedDB?.deleteDatabase(database);
    };
  }, [setUp, database]);
  return setUp;
}
