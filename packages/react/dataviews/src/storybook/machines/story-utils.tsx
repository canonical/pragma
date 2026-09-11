import type {
  DataViewsProvider,
  ResultWindow,
  RowRecord,
  SourceAdapter,
} from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSourceBinding,
} from "@canonical/dataviews-core";
import type {
  IndexedDBFactory,
  ViewDraft,
  ViewStore,
} from "@canonical/dataviews-core/views";
import { createIndexedDBViewStore } from "@canonical/dataviews-core/views";
import type { Decorator } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import type { MachineFields } from "./fixtures.js";
import { createMachineSource, machineSchema } from "./fixtures.js";

/**
 * Story machinery for the machine collection's stories — the table, its
 * filters and its bars: the provider hook every story drives and the
 * decorators that frame it. Story-only; the records and sources live in
 * `./fixtures.ts`.
 */

/**
 * The provider every story drives. Its rows are the source's own
 * records: the binding's host contract is typed over `RowRecord`.
 */
export type MachineProvider = DataViewsProvider<MachineFields>;

/** How one story's collection is set up. Read once, when the story mounts. */
export type MachineProviderOptions = {
  /** The source the table reads; every machine by default. */
  readonly source?: () => SourceAdapter;
  /** The displayed window; the provider's default page otherwise. */
  readonly window?: ResultWindow;
  /** Commands issued once the source is bound: a sort, a search, a selection. */
  readonly prepare?: (provider: MachineProvider) => void;
  /** Where the collection's saved views live; none by default. */
  readonly views?: ViewStore;
};

/**
 * A provider bound to a real source, wired the way an application wires one.
 *
 * The provider is built once, in state. The binding subscribes to the
 * provider's result channel, so it is built in an effect and disposed by the
 * same effect: a render React throws away never leaves one listening, and
 * StrictMode's rehearsal unmount disposes a binding that the kept mount then
 * rebuilds.
 */
export function useMachineProvider({
  source = createMachineSource,
  window: resultWindow,
  prepare,
  views,
}: MachineProviderOptions = {}): MachineProvider {
  const [adapter] = useState(source);
  const [provider] = useState(() =>
    createDataViewsProvider<MachineFields>({
      schema: machineSchema,
      window: resultWindow,
      // The table offers a sort only where the source declares one.
      capabilities: adapter.capabilities,
      views,
    }),
  );
  const [setUp] = useState(() => prepare);
  useEffect(() => {
    const binding = createSourceBinding({ host: provider, adapter });
    setUp?.(provider);
    // Only a provider that has never been asked needs its first page: a
    // prepared query has already been answered, and a remount finds its
    // request still pending or already settled.
    const { pendingRequestId, result } = provider.result.get();
    if (pendingRequestId === null && result.status === "idle") {
      provider.refresh();
    }
    return binding.dispose;
  }, [provider, adapter, setUp]);
  return provider;
}

/**
 * Render the story inside the `.app` scope, which the table and its bars
 * assume: primary text there takes the application sizes, and the density
 * channel its application values.
 */
export const withAppScope: Decorator = (Story) => (
  <div className="app">
    <Story />
  </div>
);

/** Render the story inside a frame of the given width, as a layout would. */
export const withFrame =
  (maxWidth: string): Decorator =>
  (Story) => (
    <div style={{ maxWidth }}>
      <Story />
    </div>
  );

/** A frame of the given height that scrolls its content, as a panel would. */
export const withScrollingFrame =
  (height: string): Decorator =>
  (Story) => (
    <div style={{ maxHeight: height, overflow: "auto" }}>
      <Story />
    </div>
  );

/** Names a record for its selection checkbox: by host, else by identity. */
export const hostName = (row: RowRecord, rowId: string): string =>
  typeof row.name === "string" ? row.name : rowId;

/** A story's saved-view store, and a way to open another tab over it. */
export type StoryViewStore = {
  readonly store: ViewStore;
  readonly openAnotherTab: () => ViewStore;
};

/** How one story's saved-view store is set up. Read once, when it mounts. */
export type StoryViewStoreOptions = {
  /** The views the store holds when the story opens. */
  readonly seed?: readonly ViewDraft[];
  /** The browser's IndexedDB by default; a stand-in shows refused storage. */
  readonly indexedDB?: IndexedDBFactory;
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
}: StoryViewStoreOptions = {}): StoryViewStore {
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
