import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import createDeferred from "../../../testing/createDeferred.js";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
import { createStandInViewStore } from "../../../testing/createStandInStores.js";
import {
  answering,
  buildStoredView,
  byId,
  declare,
} from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import openIndexedDBTab from "../../../testing/openIndexedDBTab.js";
import { createCollection } from "../collection/index.js";
import {
  createPresentation,
  type PresentationStore,
} from "../presentation/index.js";
import {
  createDataViewsProvider,
  type ProviderHost,
  readProviderHost,
} from "../provider/index.js";
import { DEFAULT_WINDOW, EMPTY_SLICE } from "../query/index.js";
import createSavedViews from "./createSavedViews.js";
import type {
  SavedView,
  SavedViews,
  ViewDraft,
  ViewList,
  ViewOutcome,
  ViewStore,
  ViewsState,
} from "./types.js";

/**
 * A provider's saved views, driven through the provider an application
 * builds, over the IndexedDB store on `fake-indexeddb`: real transactions,
 * and two stores on one factory are two tabs. Stand-in stores cover what a
 * real one cannot be made to do on cue: reject, answer late, or report an
 * unreadable record. The presentation has tests of its own; here it is
 * read where the session hands it the open view or snapshots it.
 */

const collection = createCollection({
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "cores", kind: "number", min: 1, max: 64 },
  ],
  identify: byId,
});

/** Every filter these scenarios apply, and nothing else: no search. */
const capabilities = declare({
  filter: { status: ["eq"], cores: ["gte", "lte"] },
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/**
 * A provider over the store, started on the third page of five. The
 * presentation store is the same object when the view store is a real one,
 * as an application passes it; a stand-in leaves it in memory.
 */
const createProviderOver = (
  store: ViewStore,
  presentation?: PresentationStore,
) =>
  createDataViewsProvider({
    collection,
    source: createManualSource({ capabilities, answer: answering([]) }).source,
    views: store,
    ...(presentation === undefined ? {} : { presentation }),
    snapshot: { query: "page=3&size=5", presentation: {} },
  });

type Provider = ReturnType<typeof createProviderOver>;

type Host = ProviderHost<typeof collection.schema.fields>;

/** The provider's views, which a provider given a store always has. */
const readViews = (provider: Provider): SavedViews => {
  if (provider.views === null) {
    throw new Error("expected the provider to have views");
  }
  return provider.views;
};

/** A provider over a fresh profile, its views observed and listed. */
const observeFreshProvider = async () => {
  const indexedDB = new IDBFactory();
  const store = openIndexedDBTab(indexedDB);
  const provider = createProviderOver(store, store);
  const views = readViews(provider);
  const host = readProviderHost(provider);
  const release = observeUntilFinished(views);
  observeUntilFinished(provider.presentation);
  await vi.waitFor(() => {
    expect(views.state.get().listing.status).toBe("ready");
  });
  return { indexedDB, store, provider, host, views, release };
};

/** Observe the views, as a mounted control does, until they are listed. */
const waitForListing = async (views: SavedViews): Promise<void> => {
  observeUntilFinished(views);
  await vi.waitFor(() => {
    expect(views.state.get().listing.status).toBe("ready");
  });
};

/** The view an outcome carries, or a failure naming what came instead. */
const readView = (outcome: ViewOutcome): SavedView => {
  if (!("view" in outcome)) {
    throw new Error(`expected a view, got ${JSON.stringify(outcome)}`);
  }
  return outcome.view;
};

const filterFailedOnly = (host: Host): void => {
  host.setPredicate({ field: "status", operator: "eq", operands: ["failed"] });
};

const filterCoresAtLeast = (host: Host, cores: number): void => {
  host.setPredicate({ field: "cores", operator: "gte", operands: [cores] });
};

/** Views over a stand-in store holding one view, with that view open. */
const openOver = async (overrides: Partial<ViewStore>) => {
  const view = buildStoredView();
  const provider = createProviderOver(
    createStandInViewStore({
      get: async () => ({ status: "found", view }),
      ...overrides,
    }),
  );
  const views = readViews(provider);
  await views.open(view.id);
  return { view, views, host: readProviderHost(provider) };
};

describe("createSavedViews", () => {
  it("has no views without a store: nothing is kept in memory instead", () => {
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({ capabilities }).source,
    });
    expect(provider.views).toBeNull();
  });

  it("reads nothing until observed, so a server render stays idle", () => {
    const list = vi.fn(async () => ({ views: [], unreadable: [] }));
    const subscribe = vi.fn(() => () => {});
    const views = readViews(
      createProviderOver(createStandInViewStore({ list, subscribe })),
    );
    expect(views.state.get()).toMatchObject({
      listing: { status: "idle" },
      views: [],
      current: null,
      modified: false,
      command: null,
    });
    expect(list).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("follows the host's moves only while observed: never on construction, and not after the last release", () => {
    // The provider's own host, with its transitions counted: what the views
    // subscribe to is every move a mounted control's query makes.
    const provider = createProviderOver(createStandInViewStore());
    const host = readProviderHost(provider);
    const stopHost = vi.fn();
    const subscribe = vi.fn((listener: () => void) => {
      const stop = host.transitions.subscribe(listener);
      return () => {
        stopHost();
        stop();
      };
    });
    const views = createSavedViews({
      host: {
        schema: collection.schema,
        capabilities: provider.capabilities,
        state: provider.state,
        view: host.view,
        transitions: { subscribe },
        adopt: host.adopt,
      },
      store: createStandInViewStore(),
      presentation: createPresentation(),
    });
    expect(subscribe).not.toHaveBeenCalled();
    const first = views.observe();
    const second = views.observe();
    expect(subscribe).toHaveBeenCalledTimes(1);
    first();
    expect(stopHost).not.toHaveBeenCalled();
    second();
    expect(stopHost).toHaveBeenCalledTimes(1);
  });

  it("lists the views by name once observed, with the records it cannot read", async () => {
    const list = vi.fn(async () => ({
      views: [
        buildStoredView({ id: "b", name: "Running" }),
        buildStoredView({ id: "a", name: "Failed" }),
      ],
      unreadable: [{ id: "c", reason: "record version 2 is not supported" }],
    }));
    const views = readViews(
      createProviderOver(createStandInViewStore({ list })),
    );
    observeUntilFinished(views);
    expect(views.state.get().listing.status).toBe("pending");
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("ready");
    });
    expect(views.state.get().views.map((view) => view.name)).toEqual([
      "Failed",
      "Running",
    ]);
    expect(views.state.get().unreadable).toEqual([
      { id: "c", reason: "record version 2 is not supported" },
    ]);
  });

  it("keeps the listing's identity when a notice changes none of it", async () => {
    const view = buildStoredView();
    let changed = (): void => {};
    const views = readViews(
      createProviderOver(
        createStandInViewStore({
          list: async () => ({ views: [view], unreadable: [] }),
          subscribe: (listener) => {
            changed = listener;
            return () => {};
          },
        }),
      ),
    );
    await waitForListing(views);
    const before = views.state.get().views;
    changed();
    await new Promise((settle) => setTimeout(settle));
    expect(views.state.get().views).toBe(before);
  });

  it("hears the store while any observer remains, and stops with the last", async () => {
    const unsubscribe = vi.fn();
    let heard = (): void => {};
    const list = vi.fn(async () => ({ views: [], unreadable: [] }));
    const views = readViews(
      createProviderOver(
        createStandInViewStore({
          list,
          subscribe: (listener) => {
            heard = listener;
            return unsubscribe;
          },
        }),
      ),
    );
    const first = views.observe();
    const second = views.observe();
    expect(list).toHaveBeenCalledTimes(1);
    heard();
    expect(list).toHaveBeenCalledTimes(2);
    first();
    first();
    expect(unsubscribe).not.toHaveBeenCalled();
    second();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    // Observed again, it stays listed rather than loading from scratch.
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("ready");
    });
    observeUntilFinished(views);
    expect(views.state.get().listing.status).toBe("ready");
  });

  it("starts with the provider's first observer and stops with its last", async () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    const provider = createProviderOver(createStandInViewStore({ subscribe }));
    const views = readViews(provider);
    expect(subscribe).not.toHaveBeenCalled();
    const first = provider.observe();
    const second = provider.observe();
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(views.state.get().listing.status).toBe("pending");
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("ready");
    });
    first();
    expect(unsubscribe).not.toHaveBeenCalled();
    second();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("reports storage it cannot list, and lists again when asked", async () => {
    const list = vi
      .fn<ViewStore["list"]>()
      .mockRejectedValueOnce(new Error("view storage is unavailable: blocked"))
      .mockResolvedValue({ views: [buildStoredView()], unreadable: [] });
    const views = readViews(
      createProviderOver(createStandInViewStore({ list })),
    );
    observeUntilFinished(views);
    await vi.waitFor(() => {
      expect(views.state.get().listing).toEqual({
        status: "failed",
        reason: "view storage is unavailable: blocked",
      });
    });
    views.refresh();
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("ready");
    });
    expect(views.state.get().views).toHaveLength(1);
  });

  it("takes only the latest listing, whatever the earlier ones answer", async () => {
    const early = createDeferred<ViewList>();
    const failing = createDeferred<ViewList>();
    const list = vi
      .fn<ViewStore["list"]>()
      .mockReturnValueOnce(early.promise)
      .mockReturnValueOnce(failing.promise)
      .mockResolvedValue({
        views: [buildStoredView({ name: "Latest" })],
        unreadable: [],
      });
    const views = readViews(
      createProviderOver(createStandInViewStore({ list })),
    );
    observeUntilFinished(views);
    views.refresh();
    views.refresh();
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("ready");
    });
    early.resolve({ views: [], unreadable: [] });
    failing.reject(new Error("too late"));
    await new Promise((settle) => setTimeout(settle));
    expect(views.state.get()).toMatchObject({
      listing: { status: "ready" },
      views: [{ name: "Latest" }],
    });
  });

  describe("opening and saving", () => {
    it("saves the live query as a new view with its renderer, and opens it", async () => {
      const { host, views, store } = await observeFreshProvider();
      filterFailedOnly(host);
      const outcome = await views.saveAs("  Failed machines ");
      expect(outcome.status).toBe("saved");
      const view = readView(outcome);
      expect(view).toMatchObject({
        name: "Failed machines",
        query: "as=table&status=failed",
        presentation: {},
      });
      expect(views.state.get()).toMatchObject({
        current: view,
        modified: false,
        command: { command: "save-as", status: "settled", outcome },
      });
      expect(await store.get(view.id)).toEqual({ status: "found", view });
    });

    it("is modified once the query moves, and not by the window", async () => {
      const { provider, host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      await views.saveAs("Failed");
      provider.navigateWindow({ page: 2 });
      expect(views.state.get().modified).toBe(false);
      filterCoresAtLeast(host, 8);
      expect(views.state.get().modified).toBe(true);
      host.removePredicate("cores", "gte");
      expect(views.state.get().modified).toBe(false);
    });

    it("publishes only when modified changes, not on every query move", async () => {
      const { provider, host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      await views.saveAs("Failed");
      const published: boolean[] = [];
      views.state.subscribe(() => {
        published.push(views.state.get().modified);
      });
      filterCoresAtLeast(host, 8);
      filterCoresAtLeast(host, 16);
      provider.navigateWindow({ page: 2 });
      expect(published).toEqual([true]);
    });

    it("opens a view: its query on the first page, keeping the page size", async () => {
      const { provider, host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      const view = readView(await views.saveAs("Failed"));
      host.removePredicate("status", "eq");
      // A collapsed group and a cursor belong to the query they were made
      // under: neither survives the view's.
      host.adopt(
        {
          slice: provider.state.get().slice,
          window: {
            ...provider.state.get().window,
            cursor: "page-three",
            collapsed: [["running"]],
          },
        },
        "adopt",
        null,
      );
      const outcome = await views.open(view.id);
      expect(outcome).toEqual({ status: "opened", view });
      expect(provider.state.get().slice.filter).toEqual([
        { field: "status", operator: "eq", operands: ["failed"] },
      ]);
      expect(provider.state.get().window).toEqual({
        ...DEFAULT_WINDOW,
        page: 1,
        size: 5,
      });
      expect(views.state.get()).toMatchObject({
        current: view,
        modified: false,
      });
    });

    it("reverts to the open view's query, and does nothing with none open", async () => {
      const { provider, host, views } = await observeFreshProvider();
      views.revert();
      expect(provider.state.get().window.page).toBe(3);
      filterFailedOnly(host);
      await views.saveAs("Failed");
      host.setPredicate({
        field: "status",
        operator: "eq",
        operands: ["running"],
      });
      provider.navigateWindow({ page: 4 });
      views.revert();
      expect(provider.state.get().slice.filter[0]?.operands).toEqual([
        "failed",
      ]);
      expect(provider.state.get().window.page).toBe(1);
      expect(views.state.get().modified).toBe(false);
    });

    it("refuses a view whose query it cannot read whole, keeping the live query", async () => {
      const view = buildStoredView({
        query: "as=table&status=failed&cores__gte=zero",
      });
      const views = readViews(
        createProviderOver(
          createStandInViewStore({
            get: async () => ({ status: "found", view }),
          }),
        ),
      );
      const outcome = await views.open("v1");
      expect(outcome).toMatchObject({
        status: "refused",
        view,
        issues: [expect.anything()],
      });
      expect(views.state.get().current).toBeNull();
    });

    it("reports a view that is gone or unreadable instead of opening it", async () => {
      const { views } = await observeFreshProvider();
      expect(await views.open("nothing")).toEqual({ status: "missing" });
      const unreadable = readViews(
        createProviderOver(
          createStandInViewStore({
            get: async () => ({ status: "unreadable", reason: "corrupt" }),
          }),
        ),
      );
      expect(await unreadable.open("v1")).toEqual({
        status: "unreadable",
        reason: "corrupt",
      });
    });

    it("saves the live query into the open view", async () => {
      const { host, views, store } = await observeFreshProvider();
      filterFailedOnly(host);
      const view = readView(await views.saveAs("Failed"));
      filterCoresAtLeast(host, 8);
      const outcome = await views.save();
      const saved = readView(outcome);
      expect(saved.revision).toBe(view.revision + 1);
      expect(saved.query).toBe("as=table&cores__gte=8&status=failed");
      expect(views.state.get()).toMatchObject({
        current: saved,
        modified: false,
      });
      expect(await store.get(view.id)).toEqual({
        status: "found",
        view: saved,
      });
    });

    it("keeps edits made while saving modified, and the save through a revert: only the submitted query is saved", async () => {
      const indexedDB = new IDBFactory();
      const real = openIndexedDBTab(indexedDB);
      const gate = createDeferred<void>();
      const provider = createProviderOver(
        {
          ...real,
          update: async (view, changes) => {
            await gate.promise;
            return real.update(view, changes);
          },
        },
        real,
      );
      const host = readProviderHost(provider);
      const views = readViews(provider);
      await waitForListing(views);
      filterFailedOnly(host);
      await views.saveAs("Failed");
      filterCoresAtLeast(host, 8);
      const saving = views.save();
      await vi.waitFor(() => {
        expect(views.state.get().command).toEqual({
          command: "save",
          status: "pending",
        });
      });
      // A revert leaves a command still running as it is.
      views.revert();
      expect(views.state.get().command?.status).toBe("pending");
      filterCoresAtLeast(host, 16);
      gate.resolve();
      await saving;
      expect(views.state.get().modified).toBe(true);
      filterCoresAtLeast(host, 8);
      expect(views.state.get().modified).toBe(false);
    });

    it("runs commands one at a time, each against the last one's revision", async () => {
      const { host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      const creating = views.saveAs("Failed");
      const renaming = views.rename("Failures");
      const saving = views.save();
      expect((await creating).status).toBe("saved");
      expect((await renaming).status).toBe("saved");
      const saved = readView(await saving);
      expect(saved).toMatchObject({ name: "Failures", revision: 3 });
    });

    it("refuses to save, rename or delete with no view open, writing nothing", async () => {
      const update = vi.fn<ViewStore["update"]>();
      const remove = vi.fn<ViewStore["remove"]>();
      const views = readViews(
        createProviderOver(createStandInViewStore({ update, remove })),
      );
      const published: ViewsState["command"][] = [];
      views.state.subscribe(() => {
        published.push(views.state.get().command);
      });
      expect(await views.save()).toEqual({ status: "missing" });
      expect(await views.rename("Anything")).toEqual({ status: "missing" });
      expect(await views.remove()).toEqual({ status: "missing" });
      expect(update).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      // Settled at once: nothing was ever in flight.
      expect(published.map((command) => command?.status)).toEqual([
        "settled",
        "settled",
        "settled",
      ]);
    });

    it("settles a store that rejects as failed, claiming nothing saved", async () => {
      const { view, views } = await openOver({
        update: async () => {
          throw new Error("view storage failed: quota exceeded");
        },
      });
      expect(await views.save()).toEqual({
        status: "failed",
        reason: "view storage failed: quota exceeded",
      });
      expect(views.state.get().current).toEqual(view);
    });

    it("reports a stored view it cannot read on save", async () => {
      const { view, views } = await openOver({
        update: async () => ({ status: "unreadable", reason: "corrupt" }),
      });
      expect(await views.save()).toEqual({
        status: "unreadable",
        reason: "corrupt",
      });
      expect(views.state.get().current).toEqual(view);
    });
  });

  describe("in the URL", () => {
    const failed: ViewDraft = {
      id: "failed",
      name: "Failed",
      query: "as=table&status=failed",
      presentation: {},
    };

    /**
     * A provider over a fresh profile holding the given views and a
     * recording location at `href`, observed whole and listed.
     */
    const observeAt = async (href: string, seed: readonly ViewDraft[] = []) => {
      const indexedDB = new IDBFactory();
      const store = openIndexedDBTab(indexedDB);
      for (const draft of seed) {
        await store.create(draft);
      }
      const recorded = createRecordingLocation({ href });
      const source = createManualSource({
        capabilities,
        answer: answering([]),
      });
      const provider = createDataViewsProvider({
        collection,
        source: source.source,
        views: store,
        presentation: store,
        location: recorded.location,
      });
      const views = readViews(provider);
      observeUntilFinished(provider);
      await vi.waitFor(() => {
        expect(views.state.get().listing.status).toBe("ready");
      });
      return {
        ...recorded,
        calls: source.calls,
        provider,
        views,
        host: readProviderHost(provider),
      };
    };

    it("opens a view by writing its id beside its query: one entry, pushed", async () => {
      const { views, writes, host } = await observeAt("/machines", [failed]);
      writes.length = 0;
      expect((await views.open("failed")).status).toBe("opened");
      expect(writes).toEqual([
        ["view=failed&status=failed&page=1&size=50", "push"],
      ]);
      expect(host.view.get()).toBe("failed");
    });

    it("opens a view over the query in force with one pushed entry, asking the source for nothing", async () => {
      const { views, writes, calls } = await observeAt(
        "/machines?status=failed&page=1&size=50",
        [failed],
      );
      const asked = calls.length;
      writes.length = 0;
      await views.open("failed");
      expect(writes).toEqual([
        ["view=failed&status=failed&page=1&size=50", "push"],
      ]);
      expect(calls).toHaveLength(asked);
      expect(views.state.get()).toMatchObject({
        current: { id: "failed" },
        modified: false,
      });
    });

    it("reverts in place: the entry is replaced, and the view's id kept", async () => {
      const { views, host, writes } = await observeAt("/machines", [failed]);
      await views.open("failed");
      filterCoresAtLeast(host, 8);
      writes.length = 0;
      views.revert();
      expect(writes).toEqual([
        ["view=failed&status=failed&page=1&size=50", "replace"],
      ]);
    });

    it("restores the open view on load from the id beside the query", async () => {
      const { views } = await observeAt("/machines?view=failed&status=failed", [
        failed,
      ]);
      expect(views.state.get()).toMatchObject({
        current: { id: "failed" },
        modified: false,
      });
    });

    it("restores a view whose query has moved as modified: the id is never the change", async () => {
      const { views } = await observeAt(
        "/machines?view=failed&status=failed&cores__gte=8",
        [failed],
      );
      expect(views.state.get()).toMatchObject({
        current: { id: "failed" },
        modified: true,
      });
    });

    it("loses the id of a view the store does not have, never the query", async () => {
      const { views, provider, host, writes } = await observeAt(
        "/machines?view=gone&status=failed",
      );
      expect(host.view.get()).toBeNull();
      expect(views.state.get().current).toBeNull();
      expect(provider.state.get().slice.filter).toEqual([
        { field: "status", operator: "eq", operands: ["failed"] },
      ]);
      // Respelt in place without the id: no step of history.
      expect(writes.at(-1)).toEqual([
        "status=failed&page=1&size=50",
        "replace",
      ]);
      expect(writes.every(([, history]) => history === "replace")).toBe(true);
    });

    it("lets go of an arrangement a snapshot drew under a view the store does not have", async () => {
      const hidden = { "table.hidden": ["cores"] };
      const provider = createDataViewsProvider({
        collection,
        source: createManualSource({ capabilities, answer: answering([]) })
          .source,
        views: openIndexedDBTab(new IDBFactory()),
        location: createRecordingLocation({
          href: "/machines?view=gone&status=failed",
        }).location,
        snapshot: { query: "view=gone&status=failed", presentation: hidden },
      });
      const views = readViews(provider);
      // What the server drew under the view, before anything observes.
      expect(provider.presentation.state.get().presentation).toEqual(hidden);
      observeUntilFinished(provider);
      await vi.waitFor(() => {
        expect(views.state.get().listing.status).toBe("ready");
      });
      expect(readProviderHost(provider).view.get()).toBeNull();
      expect(provider.presentation.state.get().presentation).toEqual({});
      expect(provider.readSnapshot().presentation).toEqual({});
    });

    it("loses the id of a view whose stored query it cannot read whole, keeping the URL's query", async () => {
      // This source searches nothing, so the stored query cannot be read whole.
      const { views, host, provider, writes } = await observeAt(
        "/machines?view=searching&status=failed",
        [
          {
            id: "searching",
            name: "Searching",
            query: "as=table&q=web",
            presentation: {},
          },
        ],
      );
      expect(host.view.get()).toBeNull();
      expect(views.state.get().current).toBeNull();
      expect(provider.state.get().slice.filter).toEqual([
        { field: "status", operator: "eq", operands: ["failed"] },
      ]);
      expect(writes.at(-1)).toEqual([
        "status=failed&page=1&size=50",
        "replace",
      ]);
    });

    it("keeps a named view unopened while the views cannot be listed, and opens it once they are", async () => {
      const view = buildStoredView({
        id: "failed",
        query: "as=table&status=failed",
      });
      const list = vi
        .fn<ViewStore["list"]>()
        .mockRejectedValueOnce(new Error("storage is blocked"))
        .mockResolvedValue({ views: [view], unreadable: [] });
      const { location } = createRecordingLocation({
        href: "/machines?view=failed&status=failed",
      });
      const provider = createDataViewsProvider({
        collection,
        source: createManualSource({ capabilities, answer: answering([]) })
          .source,
        views: createStandInViewStore({ list }),
        location,
      });
      const views = readViews(provider);
      observeUntilFinished(provider);
      await vi.waitFor(() => {
        expect(views.state.get().listing.status).toBe("failed");
      });
      // Named, unopened, and still in the URL: a failure is no answer.
      expect(readProviderHost(provider).view.get()).toBe("failed");
      expect(views.state.get().current).toBeNull();
      expect(location.read().get("view")).toBe("failed");
      views.refresh();
      await vi.waitFor(() => {
        expect(views.state.get().current?.id).toBe("failed");
      });
    });

    it("settles modified once when Back moves the query and the open view together", async () => {
      const running: ViewDraft = {
        id: "running",
        name: "Running",
        query: "as=table&status=running",
        presentation: {},
      };
      const { views, move } = await observeAt("/machines", [failed, running]);
      await views.open("failed");
      await views.open("running");
      const modified: boolean[] = [];
      views.state.subscribe(() => {
        modified.push(views.state.get().modified);
      });
      move("view=failed&status=failed&page=1&size=50");
      expect(views.state.get()).toMatchObject({
        current: { id: "failed" },
        modified: false,
      });
      expect(modified).not.toContain(true);
    });

    it("puts the new view's id in the URL when saving as, in one pushed entry", async () => {
      const { views, host, writes } = await observeAt("/machines");
      filterFailedOnly(host);
      writes.length = 0;
      const view = readView(await views.saveAs("Failed"));
      expect(writes).toEqual([
        [`view=${view.id}&status=failed&page=1&size=50`, "push"],
      ]);
    });

    it("drops the id when the open view is removed, in place, keeping the query", async () => {
      const { views, writes, provider } = await observeAt("/machines", [
        failed,
      ]);
      await views.open("failed");
      writes.length = 0;
      expect((await views.remove()).status).toBe("removed");
      expect(writes).toEqual([["status=failed&page=1&size=50", "replace"]]);
      expect(provider.state.get().slice.filter).toHaveLength(1);
    });

    it("closes the open view on observing again when its id went while nothing observed", async () => {
      const store = openIndexedDBTab(new IDBFactory());
      await store.create(failed);
      const provider = createDataViewsProvider({
        collection,
        source: createManualSource({ capabilities, answer: answering([]) })
          .source,
        views: store,
      });
      const views = readViews(provider);
      const release = views.observe();
      await vi.waitFor(() => {
        expect(views.state.get().listing.status).toBe("ready");
      });
      await views.open("failed");
      release();
      const host = readProviderHost(provider);
      const { window } = host.state.get();
      const published: boolean[] = [];
      views.state.subscribe(() => {
        published.push(views.state.get().modified);
      });
      // The query moves with the id, as Back to an entry before the view.
      host.adopt({ slice: EMPTY_SLICE, window }, "adopt", null);
      const again = views.observe();
      // At once, before the listing the observation starts has answered.
      expect(views.state.get().current).toBeNull();
      // The view is followed first: nothing reads modified against the view
      // just closed.
      expect(published).not.toContain(true);
      again();
    });

    it("follows Back and Forward: the id gone closes the view, and back again opens it", async () => {
      const { views, move, writes, calls } = await observeAt("/machines", [
        failed,
      ]);
      await views.open("failed");
      writes.length = 0;
      const asked = calls.length;
      move("status=failed&page=1&size=50");
      expect(views.state.get().current).toBeNull();
      move("view=failed&status=failed&page=1&size=50");
      expect(views.state.get()).toMatchObject({
        current: { id: "failed" },
        modified: false,
      });
      // Followed, never written back, and the query never moved: the source
      // was asked for nothing.
      expect(writes).toEqual([]);
      expect(calls).toHaveLength(asked);
    });
  });

  describe("across tabs", () => {
    it("conflicts on save; the stored view becomes the open one, and saving again overwrites it", async () => {
      const { indexedDB, host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      const view = readView(await views.saveAs("Failed"));
      // The other tab saves a different query into the same view.
      const other = openIndexedDBTab(indexedDB);
      const theirs = await other.update(view, {
        query: "as=table&status=running",
      });
      filterCoresAtLeast(host, 8);
      const outcome = await views.save();
      expect(outcome.status).toBe("conflict");
      const stored = readView(outcome);
      expect(stored).toEqual(readView(theirs));
      // Modified now says how the live query differs from the stored view.
      expect(views.state.get()).toMatchObject({
        current: stored,
        modified: true,
      });
      const overwritten = readView(await views.save());
      expect(overwritten).toMatchObject({
        revision: stored.revision + 1,
        query: "as=table&cores__gte=8&status=failed",
      });
    });

    it("discards the changes after a conflict by reverting to the stored query", async () => {
      const { indexedDB, provider, host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      const view = readView(await views.saveAs("Failed"));
      await openIndexedDBTab(indexedDB).update(view, {
        query: "as=table&status=running",
      });
      filterCoresAtLeast(host, 8);
      await views.save();
      views.revert();
      expect(provider.state.get().slice.filter).toEqual([
        { field: "status", operator: "eq", operands: ["running"] },
      ]);
      expect(views.state.get()).toMatchObject({
        modified: false,
        command: null,
      });
    });

    it("keeps the baseline when the stored view's query no longer reads", async () => {
      const { views } = await openOver({
        update: async () => ({
          status: "conflict",
          view: buildStoredView({ revision: 2, query: "status=bogus" }),
        }),
      });
      await views.save();
      expect(views.state.get()).toMatchObject({
        current: { revision: 2 },
        modified: false,
      });
    });

    it("loses the identity, not the query, when the other tab deleted the view", async () => {
      const { indexedDB, provider, host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      const view = readView(await views.saveAs("Failed"));
      await openIndexedDBTab(indexedDB).remove(view);
      filterCoresAtLeast(host, 8);
      expect(await views.save()).toEqual({ status: "missing" });
      expect(views.state.get().current).toBeNull();
      expect(provider.state.get().slice.filter).toHaveLength(2);
    });

    it("hears the other tab's deletion and lets the identity go", async () => {
      const { indexedDB, provider, host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      const view = readView(await views.saveAs("Failed"));
      await openIndexedDBTab(indexedDB).remove(view);
      await vi.waitFor(() => {
        expect(views.state.get().current).toBeNull();
      });
      expect(provider.state.get().slice.filter).toHaveLength(1);
    });

    it("conflicts on rename and on delete, and succeeds on the retry", async () => {
      const { indexedDB, provider, host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      const view = readView(await views.saveAs("Failed"));
      const other = openIndexedDBTab(indexedDB);
      await other.update(view, { name: "Theirs" });
      const renamed = await views.rename("Mine");
      expect(renamed.status).toBe("conflict");
      expect(views.state.get().current?.name).toBe("Theirs");
      expect(readView(await views.rename("Mine")).name).toBe("Mine");

      const current = views.state.get().current;
      if (current === null) {
        throw new Error("expected an open view");
      }
      await other.update(current, { name: "Theirs again" });
      expect((await views.remove()).status).toBe("conflict");
      expect(await views.remove()).toEqual({ status: "removed" });
      expect(views.state.get().current).toBeNull();
      expect(provider.state.get().slice.filter).toHaveLength(1);
    });

    it("reports an unreadable record on delete", async () => {
      const { view, views } = await openOver({
        remove: async () => ({ status: "unreadable", reason: "corrupt" }),
      });
      expect(await views.remove()).toEqual({
        status: "unreadable",
        reason: "corrupt",
      });
      expect(views.state.get().current).toEqual(view);
    });
  });

  describe("names", () => {
    it("refuses an empty or duplicate name before writing anything", async () => {
      const { host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      await views.saveAs("Café");
      await vi.waitFor(() => {
        expect(views.state.get().views).toHaveLength(1);
      });
      expect(await views.saveAs("   ")).toEqual({
        status: "invalid",
        reason: "a view needs a name",
      });
      // Case and Unicode composition make no different name.
      expect(await views.saveAs(" CAFÉ ")).toEqual({
        status: "invalid",
        reason: 'a view named "Café" already exists',
      });
      // A refused name leaves the status to the last command that ran.
      expect(views.state.get().command).toMatchObject({
        command: "save-as",
        status: "settled",
        outcome: { status: "saved" },
      });
    });

    it("lets a view keep its own name on rename, but not take another's", async () => {
      const { host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      await views.saveAs("Running");
      await views.saveAs("Failed");
      await vi.waitFor(() => {
        expect(views.state.get().views).toHaveLength(2);
      });
      filterCoresAtLeast(host, 8);
      expect((await views.rename("FAILED")).status).toBe("saved");
      // A rename saves no query: the moved one stays modified.
      expect(views.state.get().modified).toBe(true);
      expect(await views.rename("running")).toEqual({
        status: "invalid",
        reason: 'a view named "Running" already exists',
      });
    });

    it("retries a creation whose outcome never arrived under the same id", async () => {
      const indexedDB = new IDBFactory();
      const real = openIndexedDBTab(indexedDB);
      const create = vi
        .fn<ViewStore["create"]>()
        .mockImplementationOnce(async (draft) => {
          // The write lands; its answer is lost on the way back.
          await real.create(draft);
          throw new Error("view storage failed: connection closed");
        })
        .mockImplementation((draft) => real.create(draft));
      const views = readViews(createProviderOver({ ...real, create }, real));
      await waitForListing(views);
      expect(await views.saveAs("Failed")).toEqual({
        status: "failed",
        reason: "view storage failed: connection closed",
      });
      // The write that landed is listed, and is no rival to its own retry.
      await vi.waitFor(() => {
        expect(views.state.get().views).toHaveLength(1);
      });
      const retried = await views.saveAs("Failed");
      expect(retried.status).toBe("saved");
      expect(create.mock.calls[1]?.[0].id).toBe(create.mock.calls[0]?.[0].id);
      expect((await real.list()).views).toHaveLength(1);
    });

    it("mints a new id once the name, the query or the presentation has moved", async () => {
      const create = vi
        .fn<ViewStore["create"]>()
        .mockRejectedValue(new Error("view storage failed"));
      const provider = createProviderOver(createStandInViewStore({ create }));
      const views = readViews(provider);
      await waitForListing(views);
      await views.saveAs("Failed");
      await views.saveAs("Failures");
      await views.saveAs("Failures");
      filterFailedOnly(readProviderHost(provider));
      await views.saveAs("Failures");
      provider.presentation.arrange({ width: 120 });
      await views.saveAs("Failures");
      const ids = create.mock.calls.map(([draft]) => draft.id);
      expect(ids[0]).toMatch(/^[0-9a-f]{32}$/);
      expect(ids[2]).toBe(ids[1]);
      expect(new Set(ids).size).toBe(4);
    });

    it("reports a different view already under the id", async () => {
      const view = buildStoredView();
      const views = readViews(
        createProviderOver(
          createStandInViewStore({
            create: async () => ({ status: "conflict", view }),
          }),
        ),
      );
      await waitForListing(views);
      expect(await views.saveAs("Mine")).toEqual({ status: "conflict", view });
      expect(views.state.get().current).toBeNull();
    });
  });

  describe("lifetime", () => {
    it("forgets the open view when the provider resets", async () => {
      const { provider, host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      await views.saveAs("Failed");
      provider.reset();
      expect(views.state.get()).toMatchObject({ current: null, command: null });
    });

    it("stops hearing the store and the query once the last observer releases", async () => {
      const unsubscribe = vi.fn();
      const view = buildStoredView();
      const provider = createProviderOver(
        createStandInViewStore({
          subscribe: () => unsubscribe,
          get: async () => ({ status: "found", view }),
        }),
      );
      const host = readProviderHost(provider);
      const views = readViews(provider);
      const release = views.observe();
      await views.open(view.id);
      release();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
      // The query moves from the open view's; nothing here hears it.
      filterCoresAtLeast(host, 8);
      expect(views.state.get().modified).toBe(false);
      // Observed again, the views read the query as it now stands.
      observeUntilFinished(views);
      expect(views.state.get().modified).toBe(true);
    });

    it("lets a command still in flight when the last observer releases answer its caller", async () => {
      const view = buildStoredView();
      const gate = createDeferred<void>();
      const provider = createProviderOver(
        createStandInViewStore({
          get: async () => {
            await gate.promise;
            return { status: "found", view };
          },
        }),
      );
      const views = readViews(provider);
      const release = views.observe();
      const opening = views.open(view.id);
      release();
      gate.resolve();
      // A release is not a reset: the views stay the provider's, and the
      // command opens the view as it would have with an observer.
      expect((await opening).status).toBe("opened");
      expect(views.state.get().current).toEqual(view);
      expect(provider.state.get().slice.filter).toEqual([
        { field: "status", operator: "eq", operands: ["failed"] },
      ]);
    });
  });

  describe("races and failures", () => {
    it("refuses a name already given a moment ago, before the store lists it", async () => {
      const { host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      const first = views.saveAs("Failed");
      const second = views.saveAs("failed");
      expect((await first).status).toBe("saved");
      expect(await second).toEqual({
        status: "invalid",
        reason: 'a view named "Failed" already exists',
      });
    });

    it("refuses to check a name before the views are listed", async () => {
      const create = vi.fn<ViewStore["create"]>();
      const views = readViews(
        createProviderOver(createStandInViewStore({ create })),
      );
      expect(await views.saveAs("Failed")).toEqual({
        status: "invalid",
        reason: "the saved views are not listed, so the name cannot be checked",
      });
      expect(create).not.toHaveBeenCalled();
    });

    it("refuses a view naming a field or a clause the collection cannot run, rather than widen it", async () => {
      const view = buildStoredView({
        query: "as=table&status=failed&region=eu&q=alder",
      });
      const provider = createProviderOver(
        createStandInViewStore({
          get: async () => ({ status: "found", view }),
        }),
      );
      expect(await readViews(provider).open(view.id)).toEqual({
        status: "refused",
        view,
        issues: [
          {
            parameter: "q",
            code: "undeclared-field",
            reason: "this source cannot search",
          },
          {
            parameter: "region",
            code: "unknown-field",
            reason: '"region" names no field of this collection',
          },
        ],
      });
      expect(provider.state.get().slice.filter).toEqual([]);
    });

    it("opens a view saved in another renderer: a query applies in any", async () => {
      const view = buildStoredView({ query: "as=list&status=failed" });
      const views = readViews(
        createProviderOver(
          createStandInViewStore({
            get: async () => ({ status: "found", view }),
          }),
        ),
      );
      expect((await views.open(view.id)).status).toBe("opened");
    });

    it("lets a command still in flight when the provider resets change nothing", async () => {
      const view = buildStoredView();
      const gate = createDeferred<void>();
      const provider = createProviderOver(
        createStandInViewStore({
          get: async () => {
            await gate.promise;
            return { status: "found", view };
          },
        }),
      );
      const views = readViews(provider);
      const opening = views.open(view.id);
      await vi.waitFor(() => {
        expect(views.state.get().command?.status).toBe("pending");
      });
      provider.reset();
      gate.resolve();
      expect((await opening).status).toBe("opened");
      expect(views.state.get()).toMatchObject({ current: null, command: null });
      expect(provider.state.get().slice.filter).toEqual([]);
    });

    it("carries a change made while saving as into the new view", async () => {
      const indexedDB = new IDBFactory();
      const real = openIndexedDBTab(indexedDB);
      const gate = createDeferred<void>();
      const provider = createProviderOver(
        {
          ...real,
          create: async (draft) => {
            await gate.promise;
            return real.create(draft);
          },
        },
        real,
      );
      const views = readViews(provider);
      await waitForListing(views);
      provider.presentation.arrange({ width: 100 });
      const saving = views.saveAs("Wide");
      await vi.waitFor(() => {
        expect(views.state.get().command?.status).toBe("pending");
      });
      provider.presentation.arrange({ width: 150 });
      gate.resolve();
      const view = readView(await saving);
      expect(view.presentation).toEqual({ width: 100 });
      expect(provider.presentation.state.get().presentation).toEqual({
        width: 150,
      });
      await vi.waitFor(async () => {
        expect(await real.readPresentation({ view: view.id })).toEqual({
          width: 150,
        });
      });
    });

    it("drops a listing asked for before a view was saved, which does not know it", async () => {
      const stale = createDeferred<ViewList>();
      const created = buildStoredView({ id: "new", name: "New" });
      const list = vi
        .fn<ViewStore["list"]>()
        .mockResolvedValueOnce({ views: [], unreadable: [] })
        .mockReturnValueOnce(stale.promise)
        .mockResolvedValue({ views: [created], unreadable: [] });
      // A store tells this tab of its own writes, as the contract has it.
      let changed = (): void => {};
      const views = readViews(
        createProviderOver(
          createStandInViewStore({
            list,
            subscribe: (listener) => {
              changed = listener;
              return () => {};
            },
            create: async () => {
              changed();
              return { status: "saved", view: created };
            },
          }),
        ),
      );
      await waitForListing(views);
      views.refresh();
      await views.saveAs("New");
      stale.resolve({ views: [], unreadable: [] });
      await new Promise((settle) => setTimeout(settle));
      expect(views.state.get().current).toEqual(created);
    });

    it("rejects only the command whose state listener throws", async () => {
      const views = readViews(createProviderOver(createStandInViewStore()));
      const stop = views.state.subscribe(() => {
        throw new Error("listener failed");
      });
      await expect(views.save()).rejects.toThrow("listener failed");
      stop();
      expect(await views.save()).toEqual({ status: "missing" });
    });
  });

  describe("listing without the store's notice", () => {
    it("drops a view the store says is gone, and lists a renamed view once, before any notice", async () => {
      const view = buildStoredView();
      const provider = createProviderOver(
        createStandInViewStore({
          list: async () => ({ views: [view], unreadable: [] }),
          get: async () => ({ status: "found", view }),
          update: async (_view, changes) =>
            changes.name === undefined
              ? { status: "missing" }
              : {
                  status: "saved",
                  view: { ...view, name: changes.name, revision: 2 },
                },
        }),
      );
      const views = readViews(provider);
      await waitForListing(views);
      await views.open(view.id);
      expect(readView(await views.rename("Renamed")).name).toBe("Renamed");
      expect(views.state.get().views).toEqual([
        { ...view, name: "Renamed", revision: 2 },
      ]);
      // Saving finds the view gone: its identity and its listing go at once.
      filterCoresAtLeast(readProviderHost(provider), 8);
      expect(await views.save()).toEqual({ status: "missing" });
      expect(views.state.get()).toMatchObject({ current: null, views: [] });
    });
  });

  describe("and the presentation", () => {
    it("shows the presentation the open view, and lets it go when the view leaves", async () => {
      const { indexedDB, provider, host, views } = await observeFreshProvider();
      const readArrangement = () =>
        provider.presentation.state.get().presentation;
      provider.presentation.arrange({ width: 100 });
      filterFailedOnly(host);
      const view = readView(await views.saveAs("Failed"));
      // The viewer's change to the open view sits over what it was saved with.
      provider.presentation.arrange({ width: 150 });
      expect(readArrangement()).toEqual({ width: 150 });
      await openIndexedDBTab(indexedDB).remove(view);
      await vi.waitFor(() => {
        expect(views.state.get().current).toBeNull();
      });
      expect(readArrangement()).toEqual({ width: 100 });
    });

    it("writes a key removed while saving as null into the new view", async () => {
      const indexedDB = new IDBFactory();
      const real = openIndexedDBTab(indexedDB);
      const gate = createDeferred<void>();
      const provider = createProviderOver(
        {
          ...real,
          create: async (draft) => {
            await gate.promise;
            return real.create(draft);
          },
        },
        real,
      );
      const views = readViews(provider);
      await waitForListing(views);
      provider.presentation.arrange({ width: 100 });
      const saving = views.saveAs("Wide");
      await vi.waitFor(() => {
        expect(views.state.get().command?.status).toBe("pending");
      });
      // The viewer takes the width away while the view is being created.
      provider.presentation.arrange({ width: undefined });
      gate.resolve();
      const view = readView(await saving);
      expect(view.presentation).toEqual({ width: 100 });
      // The new view was saved with the width; the viewer's own null masks it.
      expect(provider.presentation.state.get().presentation).toEqual({
        width: null,
      });
      await vi.waitFor(async () => {
        expect(await real.readPresentation({ view: view.id })).toEqual({
          width: null,
        });
      });
    });

    it("saves the arrangement in force with a new view, and only the query into an open one", async () => {
      const { provider, host, views, store } = await observeFreshProvider();
      provider.presentation.arrange({ width: 120 });
      filterFailedOnly(host);
      const view = readView(await views.saveAs("Failed"));
      expect(view.presentation).toEqual({ width: 120 });
      // A change to the open view is the viewer's own: the view keeps what it
      // was saved with, and save writes the query alone.
      provider.presentation.arrange({ width: 180 });
      filterCoresAtLeast(host, 8);
      const saved = readView(await views.save());
      expect(saved.presentation).toEqual({ width: 120 });
      await vi.waitFor(async () => {
        expect(await store.readPresentation({ view: view.id })).toEqual({
          width: 180,
        });
      });
    });

    it("never counts the presentation as a modification", async () => {
      const { provider, host, views } = await observeFreshProvider();
      filterFailedOnly(host);
      await views.saveAs("Failed");
      const published: boolean[] = [];
      views.state.subscribe(() => {
        published.push(views.state.get().modified);
      });
      provider.presentation.arrange({ width: 300 });
      expect(views.state.get().modified).toBe(false);
      expect(published).toEqual([]);
    });

    it("keeps the view's saved arrangement and the viewer's own when the stored view becomes the open one after a conflict", async () => {
      const { indexedDB, provider, host, views, store } =
        await observeFreshProvider();
      const other = openIndexedDBTab(indexedDB);
      await other.create({
        id: "wide",
        name: "Wide",
        query: "as=table&status=failed",
        presentation: { width: 240 },
      });
      expect((await views.open("wide")).status).toBe("opened");
      // The viewer's own change to the open view, made before the conflict.
      provider.presentation.arrange({ density: "dense" });
      await other.update(
        { id: "wide", revision: 1 },
        { query: "as=table&status=running" },
      );
      filterCoresAtLeast(host, 8);
      expect((await views.save()).status).toBe("conflict");
      // The stored view's saved arrangement layers; the viewer's own stays.
      expect(provider.presentation.state.get().presentation).toEqual({
        width: 240,
        density: "dense",
      });
      await vi.waitFor(async () => {
        expect(await store.readPresentation({ view: "wide" })).toEqual({
          density: "dense",
        });
      });
    });
  });
});
