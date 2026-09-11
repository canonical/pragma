import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import createDataViewsProvider from "../provider/createDataViewsProvider.js";
import type { DataViewsProvider } from "../provider/types.js";
import createSchema from "../schema/createSchema.js";
import createArraySource from "../source/createArraySource.js";
import createIndexedDBViewStore from "./createIndexedDBViewStore.js";
import type {
  PreferenceResult,
  ProviderViews,
  SavedView,
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
 * unreadable record.
 */

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "running"] },
  { field: "cores", kind: "number", min: 1, max: 64 },
]);

type Fields = typeof schema.fields;

const capabilities = createArraySource({
  rows: [],
  fields: ["status", "cores"],
}).capabilities;

const stores: ViewStore[] = [];

afterEach(() => {
  // Providers first, so a write still gathering reaches a live store.
  for (const provider of providers.splice(0)) {
    provider.dispose();
  }
  for (const store of stores.splice(0)) {
    store.dispose();
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** A browser profile's IndexedDB. */
type Factory = InstanceType<typeof IDBFactory>;

/** One tab's store over a browser profile's IndexedDB. */
const tab = (indexedDB: Factory): ViewStore => {
  const store = createIndexedDBViewStore({
    indexedDB,
    database: "operations-console-views",
    collection: "machines",
    partition: null,
  });
  stores.push(store);
  return store;
};

const providers: DataViewsProvider<Fields>[] = [];

const providerOver = (store: ViewStore): DataViewsProvider<Fields> => {
  const provider = createDataViewsProvider<Fields>({
    schema,
    capabilities,
    window: { page: 3, size: 5 },
    views: store,
  });
  providers.push(provider);
  return provider;
};

/** The provider's views, which a provider given a store always has. */
const viewsOf = (provider: DataViewsProvider<Fields>): ProviderViews => {
  if (provider.views === null) {
    throw new Error("expected the provider to have views");
  }
  return provider.views;
};

/** A provider over a fresh profile, observed as a mounted control would. */
const observed = async () => {
  const indexedDB = new IDBFactory();
  const store = tab(indexedDB);
  const provider = providerOver(store);
  const views = viewsOf(provider);
  const release = views.observe();
  await vi.waitFor(() => {
    expect(views.state.get().listing.status).toBe("listed");
  });
  return { indexedDB, store, provider, views, release };
};

/** Observe the views, as a mounted control does, until they are listed. */
const listed = async (views: ProviderViews): Promise<void> => {
  views.observe();
  await vi.waitFor(() => {
    expect(views.state.get().listing.status).toBe("listed");
  });
};

/** The view an outcome carries, or a failure naming what came instead. */
const viewOf = (outcome: ViewOutcome): SavedView => {
  if (!("view" in outcome)) {
    throw new Error(`expected a view, got ${JSON.stringify(outcome)}`);
  }
  return outcome.view;
};

const failedOnly = (provider: DataViewsProvider<Fields>): void => {
  provider.fields.status.eq.set(["failed"]);
};

/** A store whose every method rejects or answers as a test says. */
const standIn = (overrides: Partial<ViewStore> = {}): ViewStore => ({
  list: async () => ({ views: [], unreadable: [] }),
  get: async () => ({ status: "missing" }),
  create: async () => {
    throw new Error("unexpected create");
  },
  update: async () => ({ status: "missing" }),
  remove: async () => ({ status: "removed" }),
  pin: async () => ({ status: "saved" }),
  unpin: async () => ({ status: "saved" }),
  readPresentation: async () => ({}),
  patchPresentation: async () => ({ status: "saved" }),
  subscribe: () => () => {},
  dispose: () => {},
  ...overrides,
});

const storedView = (overrides: Partial<SavedView> = {}): SavedView => ({
  id: "v1",
  name: "Failed",
  query: "as=table&status=failed",
  presentation: null,
  revision: 1,
  pinned: false,
  createdAt: "2026-09-11T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
  ...overrides,
});

/** Views over a stand-in store holding one view, with that view open. */
const openOver = async (overrides: Partial<ViewStore>) => {
  const view = storedView();
  const views = viewsOf(
    providerOver(
      standIn({ get: async () => ({ status: "found", view }), ...overrides }),
    ),
  );
  await views.open(view.id);
  return { view, views };
};

/** A promise and its settling functions, to answer a stand-in call on cue. */
const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
};

describe("createProviderViews", () => {
  it("has no views without a store: nothing is kept in memory instead", () => {
    const provider = createDataViewsProvider<Fields>({ schema });
    expect(provider.views).toBeNull();
  });

  it("reads nothing until observed, so a server render stays idle", () => {
    const list = vi.fn(async () => ({ views: [], unreadable: [] }));
    const subscribe = vi.fn(() => () => {});
    const readPresentation = vi.fn(async () => ({}));
    const views = viewsOf(
      providerOver(standIn({ list, subscribe, readPresentation })),
    );
    expect(views.state.get()).toMatchObject({
      listing: { status: "idle" },
      views: [],
      current: null,
      modified: false,
      operation: null,
      presentation: {},
      presentationFailure: null,
    });
    expect(list).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
    expect(readPresentation).not.toHaveBeenCalled();
  });

  it("lists the views by name once observed, with the records it cannot read", async () => {
    const list = vi.fn(async () => ({
      views: [
        storedView({ id: "b", name: "Running" }),
        storedView({ id: "a", name: "Failed" }),
      ],
      unreadable: [{ id: "c", reason: "record version 2 is not supported" }],
    }));
    const views = viewsOf(providerOver(standIn({ list })));
    views.observe();
    expect(views.state.get().listing.status).toBe("loading");
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("listed");
    });
    expect(views.state.get().views.map((view) => view.name)).toEqual([
      "Failed",
      "Running",
    ]);
    expect(views.state.get().unreadable).toEqual([
      { id: "c", reason: "record version 2 is not supported" },
    ]);
  });

  it("hears the store while any observer remains, and stops with the last", async () => {
    const unsubscribe = vi.fn();
    let heard = (): void => {};
    const list = vi.fn(async () => ({ views: [], unreadable: [] }));
    const views = viewsOf(
      providerOver(
        standIn({
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
      expect(views.state.get().listing.status).toBe("listed");
    });
    views.observe();
    expect(views.state.get().listing.status).toBe("listed");
  });

  it("reports storage it cannot list, and lists again when asked", async () => {
    const list = vi
      .fn<ViewStore["list"]>()
      .mockRejectedValueOnce(new Error("view storage is unavailable: blocked"))
      .mockResolvedValue({ views: [storedView()], unreadable: [] });
    const views = viewsOf(providerOver(standIn({ list })));
    views.observe();
    await vi.waitFor(() => {
      expect(views.state.get().listing).toEqual({
        status: "unavailable",
        reason: "view storage is unavailable: blocked",
      });
    });
    views.reload();
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("listed");
    });
    expect(views.state.get().views).toHaveLength(1);
  });

  it("takes only the latest listing, whatever the earlier ones answer", async () => {
    const early = deferred<ViewList>();
    const failing = deferred<ViewList>();
    const list = vi
      .fn<ViewStore["list"]>()
      .mockReturnValueOnce(early.promise)
      .mockReturnValueOnce(failing.promise)
      .mockResolvedValue({
        views: [storedView({ name: "Latest" })],
        unreadable: [],
      });
    const views = viewsOf(providerOver(standIn({ list })));
    views.observe();
    views.reload();
    views.reload();
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("listed");
    });
    early.resolve({ views: [], unreadable: [] });
    failing.reject(new Error("too late"));
    await new Promise((settle) => setTimeout(settle));
    expect(views.state.get()).toMatchObject({
      listing: { status: "listed" },
      views: [{ name: "Latest" }],
    });
  });
});

describe("createProviderViews opening and saving", () => {
  it("saves the live query as a new view with its renderer, and opens it", async () => {
    const { provider, views, store } = await observed();
    failedOnly(provider);
    const outcome = await views.saveAs("  Failed machines ");
    expect(outcome.status).toBe("saved");
    const view = viewOf(outcome);
    expect(view).toMatchObject({
      name: "Failed machines",
      query: "as=table&status=failed",
      presentation: {},
    });
    expect(views.state.get()).toMatchObject({
      current: view,
      modified: false,
      operation: { action: "saveAs", status: "settled", outcome },
    });
    expect(await store.get(view.id)).toEqual({ status: "found", view });
  });

  it("is modified once the query moves, and not by the window", async () => {
    const { provider, views } = await observed();
    failedOnly(provider);
    await views.saveAs("Failed");
    provider.navigateWindow(2);
    expect(views.state.get().modified).toBe(false);
    provider.fields.cores.gte.edit("8");
    expect(views.state.get().modified).toBe(true);
    provider.fields.cores.gte.clear();
    expect(views.state.get().modified).toBe(false);
  });

  it("publishes only when modified changes, not on every query move", async () => {
    const { provider, views } = await observed();
    failedOnly(provider);
    await views.saveAs("Failed");
    const published: boolean[] = [];
    views.state.subscribe(() => {
      published.push(views.state.get().modified);
    });
    provider.fields.cores.gte.edit("8");
    provider.fields.cores.gte.edit("16");
    provider.navigateWindow(2);
    expect(published).toEqual([true]);
  });

  it("opens a view: its query on the first page, keeping the page size", async () => {
    const { provider, views } = await observed();
    failedOnly(provider);
    const view = viewOf(await views.saveAs("Failed"));
    provider.fields.status.eq.clear();
    const outcome = await views.open(view.id);
    expect(outcome).toEqual({ status: "opened", view });
    expect(provider.result.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    expect(provider.result.get().window).toEqual({ page: 1, size: 5 });
    expect(views.state.get()).toMatchObject({ current: view, modified: false });
  });

  it("resets to the open view's query, and does nothing with none open", async () => {
    const { provider, views } = await observed();
    views.reset();
    expect(provider.result.get().window.page).toBe(3);
    failedOnly(provider);
    await views.saveAs("Failed");
    provider.fields.status.eq.set(["running"]);
    provider.navigateWindow(4);
    views.reset();
    expect(provider.result.get().slice.filter[0].operands).toEqual(["failed"]);
    expect(provider.result.get().window.page).toBe(1);
    expect(views.state.get().modified).toBe(false);
  });

  it("refuses a view whose query it cannot read whole, keeping the live query", async () => {
    const view = storedView({
      query: "as=table&status=failed&cores__gte=zero",
    });
    const views = viewsOf(
      providerOver(standIn({ get: async () => ({ status: "found", view }) })),
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
    const { views } = await observed();
    expect(await views.open("nothing")).toEqual({ status: "missing" });
    const unreadable = viewsOf(
      providerOver(
        standIn({
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
    const { provider, views, store } = await observed();
    failedOnly(provider);
    const view = viewOf(await views.saveAs("Failed"));
    provider.fields.cores.gte.edit("8");
    const outcome = await views.save();
    const saved = viewOf(outcome);
    expect(saved.revision).toBe(view.revision + 1);
    expect(saved.query).toBe("as=table&cores__gte=8&status=failed");
    expect(views.state.get()).toMatchObject({
      current: saved,
      modified: false,
    });
    expect(await store.get(view.id)).toEqual({ status: "found", view: saved });
  });

  it("keeps edits made while saving modified, and the save through a reset: only the submitted query is saved", async () => {
    const indexedDB = new IDBFactory();
    const real = tab(indexedDB);
    const gate = deferred<void>();
    const provider = providerOver({
      ...real,
      update: async (view, changes) => {
        await gate.promise;
        return real.update(view, changes);
      },
    });
    const views = viewsOf(provider);
    await listed(views);
    failedOnly(provider);
    await views.saveAs("Failed");
    provider.fields.cores.gte.edit("8");
    const saving = views.save();
    await vi.waitFor(() => {
      expect(views.state.get().operation).toEqual({
        action: "save",
        status: "pending",
      });
    });
    // A reset leaves an operation still running as it is.
    views.reset();
    expect(views.state.get().operation?.status).toBe("pending");
    provider.fields.cores.gte.edit("16");
    gate.resolve();
    await saving;
    expect(views.state.get().modified).toBe(true);
    provider.fields.cores.gte.edit("8");
    expect(views.state.get().modified).toBe(false);
  });

  it("runs operations one at a time, each against the last one's revision", async () => {
    const { provider, views } = await observed();
    failedOnly(provider);
    const creating = views.saveAs("Failed");
    const renaming = views.rename("Failures");
    const saving = views.save();
    expect((await creating).status).toBe("saved");
    expect((await renaming).status).toBe("saved");
    const saved = viewOf(await saving);
    expect(saved).toMatchObject({ name: "Failures", revision: 3 });
  });

  it("refuses to save, rename or delete with no view open, writing nothing", async () => {
    const update = vi.fn<ViewStore["update"]>();
    const remove = vi.fn<ViewStore["remove"]>();
    const views = viewsOf(providerOver(standIn({ update, remove })));
    const published: ViewsState["operation"][] = [];
    views.state.subscribe(() => {
      published.push(views.state.get().operation);
    });
    expect(await views.save()).toEqual({ status: "missing" });
    expect(await views.rename("Anything")).toEqual({ status: "missing" });
    expect(await views.remove()).toEqual({ status: "missing" });
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    // Settled at once: nothing was ever in flight.
    expect(published.map((operation) => operation?.status)).toEqual([
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

describe("createProviderViews across tabs", () => {
  it("conflicts on save; the stored view becomes the open one, and saving again overwrites it", async () => {
    const { indexedDB, provider, views } = await observed();
    failedOnly(provider);
    const view = viewOf(await views.saveAs("Failed"));
    // The other tab saves a different query into the same view.
    const other = tab(indexedDB);
    const theirs = await other.update(view, {
      query: "as=table&status=running",
    });
    provider.fields.cores.gte.edit("8");
    const outcome = await views.save();
    expect(outcome.status).toBe("conflict");
    const stored = viewOf(outcome);
    expect(stored).toEqual(viewOf(theirs));
    // Modified now says how the live query differs from the stored view.
    expect(views.state.get()).toMatchObject({
      current: stored,
      modified: true,
    });
    const overwritten = viewOf(await views.save());
    expect(overwritten).toMatchObject({
      revision: stored.revision + 1,
      query: "as=table&cores__gte=8&status=failed",
    });
  });

  it("discards the changes after a conflict by resetting to the stored query", async () => {
    const { indexedDB, provider, views } = await observed();
    failedOnly(provider);
    const view = viewOf(await views.saveAs("Failed"));
    await tab(indexedDB).update(view, { query: "as=table&status=running" });
    provider.fields.cores.gte.edit("8");
    await views.save();
    views.reset();
    expect(provider.result.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["running"] },
    ]);
    expect(views.state.get()).toMatchObject({
      modified: false,
      operation: null,
    });
  });

  it("keeps the baseline when the stored view's query no longer reads", async () => {
    const { views } = await openOver({
      update: async () => ({
        status: "conflict",
        view: storedView({ revision: 2, query: "status=bogus" }),
      }),
    });
    await views.save();
    expect(views.state.get()).toMatchObject({
      current: { revision: 2 },
      modified: false,
    });
  });

  it("loses the identity, not the query, when the other tab deleted the view", async () => {
    const { indexedDB, provider, views } = await observed();
    failedOnly(provider);
    const view = viewOf(await views.saveAs("Failed"));
    await tab(indexedDB).remove(view);
    provider.fields.cores.gte.edit("8");
    expect(await views.save()).toEqual({ status: "missing" });
    expect(views.state.get().current).toBeNull();
    expect(provider.result.get().slice.filter).toHaveLength(2);
  });

  it("hears the other tab's deletion and lets the identity go", async () => {
    const { indexedDB, provider, views } = await observed();
    failedOnly(provider);
    const view = viewOf(await views.saveAs("Failed"));
    await tab(indexedDB).remove(view);
    await vi.waitFor(() => {
      expect(views.state.get().current).toBeNull();
    });
    expect(provider.result.get().slice.filter).toHaveLength(1);
  });

  it("conflicts on rename and on delete, and succeeds on the retry", async () => {
    const { indexedDB, provider, views } = await observed();
    failedOnly(provider);
    const view = viewOf(await views.saveAs("Failed"));
    const other = tab(indexedDB);
    await other.update(view, { name: "Theirs" });
    const renamed = await views.rename("Mine");
    expect(renamed.status).toBe("conflict");
    expect(views.state.get().current?.name).toBe("Theirs");
    expect(viewOf(await views.rename("Mine")).name).toBe("Mine");

    const current = views.state.get().current;
    if (current === null) {
      throw new Error("expected an open view");
    }
    await other.update(current, { name: "Theirs again" });
    expect((await views.remove()).status).toBe("conflict");
    expect(await views.remove()).toEqual({ status: "removed" });
    expect(views.state.get().current).toBeNull();
    expect(provider.result.get().slice.filter).toHaveLength(1);
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

describe("createProviderViews names", () => {
  it("refuses an empty or duplicate name before writing anything", async () => {
    const { provider, views } = await observed();
    failedOnly(provider);
    await views.saveAs("Café");
    await vi.waitFor(() => {
      expect(views.state.get().views).toHaveLength(1);
    });
    expect(await views.saveAs("   ")).toEqual({
      status: "invalid",
      reason: "a view needs a name",
    });
    // Case and Unicode composition make no different name.
    expect(await views.saveAs(" CAFE\u0301 ")).toEqual({
      status: "invalid",
      reason: 'a view named "Café" already exists',
    });
    // A refused name leaves the status to the last operation that ran.
    expect(views.state.get().operation).toMatchObject({
      action: "saveAs",
      status: "settled",
      outcome: { status: "saved" },
    });
  });

  it("lets a view keep its own name on rename, but not take another's", async () => {
    const { provider, views } = await observed();
    failedOnly(provider);
    await views.saveAs("Running");
    await views.saveAs("Failed");
    await vi.waitFor(() => {
      expect(views.state.get().views).toHaveLength(2);
    });
    provider.fields.cores.gte.edit("8");
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
    const real = tab(indexedDB);
    const create = vi
      .fn<ViewStore["create"]>()
      .mockImplementationOnce(async (draft) => {
        // The write lands; its answer is lost on the way back.
        await real.create(draft);
        throw new Error("view storage failed: connection closed");
      })
      .mockImplementation((draft) => real.create(draft));
    const views = viewsOf(providerOver({ ...real, create }));
    await listed(views);
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
    expect(create.mock.calls[1][0].id).toBe(create.mock.calls[0][0].id);
    expect((await real.list()).views).toHaveLength(1);
  });

  it("mints a new id once the name, the query or the presentation has moved", async () => {
    const create = vi
      .fn<ViewStore["create"]>()
      .mockRejectedValue(new Error("view storage failed"));
    const provider = providerOver(standIn({ create }));
    const views = viewsOf(provider);
    await listed(views);
    await views.saveAs("Failed");
    await views.saveAs("Failures");
    await views.saveAs("Failures");
    failedOnly(provider);
    await views.saveAs("Failures");
    views.arrange({ width: 120 });
    await views.saveAs("Failures");
    const ids = create.mock.calls.map(([draft]) => draft.id);
    expect(ids[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(ids[2]).toBe(ids[1]);
    expect(new Set(ids).size).toBe(4);
  });

  it("reports a different view already under the id", async () => {
    const view = storedView();
    const views = viewsOf(
      providerOver(
        standIn({ create: async () => ({ status: "conflict", view }) }),
      ),
    );
    await listed(views);
    expect(await views.saveAs("Mine")).toEqual({ status: "conflict", view });
    expect(views.state.get().current).toBeNull();
  });
});

describe("createProviderViews presentation", () => {
  it("layers the default arrangement, the view's own and the viewer's changes to it", async () => {
    const indexedDB = new IDBFactory();
    const store = tab(indexedDB);
    await store.patchPresentation("default", { density: "dense", width: 100 });
    const provider = providerOver(store);
    const views = viewsOf(provider);
    views.observe();
    await vi.waitFor(() => {
      expect(views.state.get().presentation).toEqual({
        density: "dense",
        width: 100,
      });
    });
    const created = await store.create({
      id: "v1",
      name: "Wide",
      query: "as=table",
      presentation: { width: 200, order: ["name"] },
    });
    await store.patchPresentation({ view: "v1" }, { order: ["owner"] });
    await views.open(viewOf(created).id);
    await vi.waitFor(() => {
      expect(views.state.get().presentation).toEqual({
        density: "dense",
        width: 200,
        order: ["owner"],
      });
    });
  });

  it("saves a change to the default arrangement while no view is open", async () => {
    const { views, store } = await observed();
    views.arrange({ width: 120 });
    expect(views.state.get().presentation).toEqual({ width: 120 });
    await vi.waitFor(async () => {
      expect(await store.readPresentation("default")).toEqual({ width: 120 });
    });
    views.arrange({ width: undefined });
    expect(views.state.get().presentation).toEqual({});
  });

  it("saves a change to the open view's own preferences, never its saved presentation", async () => {
    const { provider, views, store } = await observed();
    failedOnly(provider);
    views.arrange({ width: 120 });
    const view = viewOf(await views.saveAs("Failed"));
    expect(view.presentation).toEqual({ width: 120 });
    views.arrange({ width: 180 });
    await vi.waitFor(async () => {
      expect(await store.readPresentation({ view: view.id })).toEqual({
        width: 180,
      });
    });
    expect(await store.get(view.id)).toMatchObject({
      view: { presentation: { width: 120 } },
    });
    expect(await store.readPresentation("default")).toEqual({ width: 120 });
    expect(views.state.get().presentation).toEqual({ width: 180 });
  });

  it("shows a change another tab makes to the arrangement", async () => {
    const { indexedDB, store, views } = await observed();
    views.arrange({ width: 120 });
    await vi.waitFor(async () => {
      expect(await store.readPresentation("default")).toEqual({ width: 120 });
    });
    await tab(indexedDB).patchPresentation("default", { width: 200 });
    await vi.waitFor(() => {
      expect(views.state.get().presentation).toEqual({ width: 200 });
    });
  });

  it("keeps changes made while a read was out, removals included", async () => {
    const read = deferred<Record<string, number>>();
    const views = viewsOf(
      providerOver(standIn({ readPresentation: () => read.promise })),
    );
    views.observe();
    views.arrange({ width: 120, height: undefined });
    read.resolve({ width: 90, height: 30, depth: 4 });
    await vi.waitFor(() => {
      expect(views.state.get().presentation).toEqual({ width: 120, depth: 4 });
    });
  });

  it("takes only the latest read, whichever answers first", async () => {
    const reads: ReturnType<typeof deferred<Record<string, number>>>[] = [];
    const view = storedView();
    const views = viewsOf(
      providerOver(
        standIn({
          get: async () => ({ status: "found", view }),
          readPresentation: () => {
            const read = deferred<Record<string, number>>();
            reads.push(read);
            return read.promise;
          },
        }),
      ),
    );
    views.observe();
    await views.open(view.id);
    // Observing read the default; opening read it again with the view's.
    expect(reads).toHaveLength(3);
    reads[1].resolve({ width: 90 });
    reads[2].resolve({ own: 1 });
    await vi.waitFor(() => {
      expect(views.state.get().presentation).toEqual({ width: 90, own: 1 });
    });
    reads[0].resolve({ stale: 1 });
    await new Promise((settle) => setTimeout(settle));
    expect(views.state.get().presentation).toEqual({ width: 90, own: 1 });
  });

  it("reports preferences it cannot read, and clears the report once it can", async () => {
    const readPresentation = vi
      .fn<ViewStore["readPresentation"]>()
      .mockRejectedValueOnce(new Error("view storage is unavailable: blocked"))
      .mockResolvedValue({});
    const views = viewsOf(providerOver(standIn({ readPresentation })));
    views.observe();
    await vi.waitFor(() => {
      expect(views.state.get().presentationFailure).toBe(
        "view storage is unavailable: blocked",
      );
    });
    views.reload();
    await vi.waitFor(() => {
      expect(views.state.get().presentationFailure).toBeNull();
    });
  });

  it("reports a change to a view that no longer exists as unsaved", async () => {
    const { views } = await openOver({
      patchPresentation: async () => ({ status: "missing" }),
    });
    views.arrange({ width: 120 });
    await vi.waitFor(() => {
      expect(views.state.get().presentationFailure).toBe(
        "the view no longer exists",
      );
    });
    // The view's preferences leave with it, and so does their report.
    await views.remove();
    expect(views.state.get().presentationFailure).toBeNull();
  });

  it("ignores a read failure an earlier read reports late", async () => {
    const early = deferred<Record<string, number>>();
    const readPresentation = vi
      .fn<ViewStore["readPresentation"]>()
      .mockReturnValueOnce(early.promise)
      .mockResolvedValue({});
    const views = viewsOf(providerOver(standIn({ readPresentation })));
    views.observe();
    views.reload();
    early.reject(new Error("too late"));
    await new Promise((settle) => setTimeout(settle));
    expect(views.state.get().presentationFailure).toBeNull();
  });
});

describe("createProviderViews lifetime", () => {
  it("forgets the open view when the scope rotates", async () => {
    const { provider, views } = await observed();
    failedOnly(provider);
    await views.saveAs("Failed");
    provider.rotateScope();
    expect(views.state.get()).toMatchObject({ current: null, operation: null });
  });

  it("disposes cleanly when nothing ever observed it", () => {
    const provider = providerOver(standIn());
    const views = viewsOf(provider);
    const before = views.state.get();
    provider.dispose();
    failedOnly(provider);
    expect(views.state.get()).toBe(before);
  });

  it("stops hearing the store and the query once disposed", async () => {
    const unsubscribe = vi.fn();
    const view = storedView();
    const gate = deferred<void>();
    const provider = providerOver(
      standIn({
        subscribe: () => unsubscribe,
        get: async () => {
          await gate.promise;
          return { status: "found", view };
        },
      }),
    );
    const views = viewsOf(provider);
    views.observe();
    const opening = views.open(view.id);
    const before = views.state.get();
    provider.dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    gate.resolve();
    // The outcome still answers the caller; the state no longer moves.
    expect((await opening).status).toBe("opened");
    expect(views.state.get()).toBe(before);
    expect(provider.result.get().slice.filter).toEqual([]);
  });
});

describe("createProviderViews races and failures", () => {
  it("refuses a name already given a moment ago, before the store lists it", async () => {
    const { provider, views } = await observed();
    failedOnly(provider);
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
    const views = viewsOf(providerOver(standIn({ create })));
    expect(await views.saveAs("Failed")).toEqual({
      status: "invalid",
      reason: "the saved views are not listed, so the name cannot be checked",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a view naming a field or a clause the collection cannot run, rather than widen it", async () => {
    const view = storedView({
      query: "as=table&status=failed&region=eu&q=alder",
    });
    const provider = providerOver(
      standIn({ get: async () => ({ status: "found", view }) }),
    );
    expect(await viewsOf(provider).open(view.id)).toEqual({
      status: "refused",
      view,
      issues: [
        { parameter: "q", reason: "this source cannot search" },
        {
          parameter: "region",
          reason: '"region" names no field of this collection',
        },
      ],
    });
    expect(provider.result.get().slice.filter).toEqual([]);
  });

  it("opens a view saved in another renderer: a query applies in any", async () => {
    const view = storedView({ query: "as=list&status=failed" });
    const views = viewsOf(
      providerOver(standIn({ get: async () => ({ status: "found", view }) })),
    );
    expect((await views.open(view.id)).status).toBe("opened");
  });

  it("lets an operation still in flight when the scope rotates change nothing", async () => {
    const view = storedView();
    const gate = deferred<void>();
    const provider = providerOver(
      standIn({
        get: async () => {
          await gate.promise;
          return { status: "found", view };
        },
      }),
    );
    const views = viewsOf(provider);
    const opening = views.open(view.id);
    await vi.waitFor(() => {
      expect(views.state.get().operation?.status).toBe("pending");
    });
    provider.rotateScope();
    gate.resolve();
    expect((await opening).status).toBe("opened");
    expect(views.state.get()).toMatchObject({ current: null, operation: null });
    expect(provider.result.get().slice.filter).toEqual([]);
  });

  it("keeps a change it could not save, reported, through later reads, until retried", async () => {
    const patchPresentation = vi
      .fn<ViewStore["patchPresentation"]>()
      .mockRejectedValueOnce(new Error("view storage failed: quota exceeded"))
      .mockResolvedValue({ status: "saved" });
    let changed = (): void => {};
    const views = viewsOf(
      providerOver(
        standIn({
          readPresentation: async () => ({}),
          patchPresentation,
          subscribe: (listener) => {
            changed = listener;
            return () => {};
          },
        }),
      ),
    );
    await listed(views);
    views.arrange({ width: 120 });
    await vi.waitFor(() => {
      expect(views.state.get().presentationFailure).toBe(
        "view storage failed: quota exceeded",
      );
    });
    // Read again, and another key written: still unsaved, still reported.
    changed();
    views.arrange({ height: 1 });
    await vi.waitFor(() => {
      expect(patchPresentation).toHaveBeenCalledTimes(2);
    });
    await new Promise((settle) => setTimeout(settle));
    expect(views.state.get()).toMatchObject({
      presentation: { width: 120, height: 1 },
      presentationFailure: "view storage failed: quota exceeded",
    });
    views.reload();
    await vi.waitFor(() => {
      expect(views.state.get().presentationFailure).toBeNull();
    });
    expect(patchPresentation).toHaveBeenLastCalledWith("default", {
      width: 120,
    });
  });

  it("keeps a change not yet written through a read that began before it was", async () => {
    let changed = (): void => {};
    const views = viewsOf(
      providerOver(
        standIn({
          readPresentation: async () => ({ width: 90 }),
          subscribe: (listener) => {
            changed = listener;
            return () => {};
          },
        }),
      ),
    );
    await listed(views);
    views.arrange({ width: 120 });
    changed();
    await new Promise((settle) => setTimeout(settle));
    expect(views.state.get().presentation).toEqual({ width: 120 });
  });

  it("lets a later change own its key: an older write failing late reports nothing", async () => {
    const older = deferred<PreferenceResult>();
    const patchPresentation = vi
      .fn<ViewStore["patchPresentation"]>()
      .mockReturnValueOnce(older.promise)
      // The later write never settles: only the older one can report.
      .mockReturnValue(new Promise(() => {}));
    const views = viewsOf(providerOver(standIn({ patchPresentation })));
    views.arrange({ width: 120 });
    await vi.waitFor(() => {
      expect(patchPresentation).toHaveBeenCalledTimes(1);
    });
    views.arrange({ width: 130 });
    older.reject(new Error("view storage failed"));
    await vi.waitFor(() => {
      expect(patchPresentation).toHaveBeenCalledTimes(2);
    });
    expect(views.state.get()).toMatchObject({
      presentation: { width: 130 },
      presentationFailure: null,
    });
  });

  it("writes a burst of changes to one target once, merged", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const patchPresentation = vi.fn<ViewStore["patchPresentation"]>(
      async () => ({ status: "saved" }),
    );
    const views = viewsOf(providerOver(standIn({ patchPresentation })));
    views.arrange({ width: 100 });
    views.arrange({ width: 110, height: 20 });
    views.arrange({ width: 120 });
    expect(views.state.get().presentation).toEqual({ width: 120, height: 20 });
    await vi.advanceTimersByTimeAsync(199);
    expect(patchPresentation).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(patchPresentation.mock.calls).toEqual([
      ["default", { width: 120, height: 20 }],
    ]);
  });

  it("writes the changes still gathering when the provider is disposed, and none after", async () => {
    const patchPresentation = vi.fn<ViewStore["patchPresentation"]>(
      async () => ({ status: "saved" }),
    );
    const provider = providerOver(standIn({ patchPresentation }));
    viewsOf(provider).arrange({ width: 100 });
    provider.dispose();
    expect(patchPresentation).toHaveBeenCalledWith("default", { width: 100 });
    // A change after that is ignored: the collection is gone for good.
    viewsOf(provider).arrange({ width: 200 });
    await new Promise((settle) => setTimeout(settle, 250));
    expect(patchPresentation).toHaveBeenCalledTimes(1);
  });

  it("writes again the open view's preferences whose write failed", async () => {
    const patchPresentation = vi
      .fn<ViewStore["patchPresentation"]>()
      .mockRejectedValueOnce(new Error("view storage failed"))
      .mockResolvedValue({ status: "saved" });
    const { view, views } = await openOver({ patchPresentation });
    views.arrange({ width: 120 });
    await vi.waitFor(() => {
      expect(views.state.get().presentationFailure).toBe("view storage failed");
    });
    views.reload();
    await vi.waitFor(() => {
      expect(views.state.get().presentationFailure).toBeNull();
    });
    expect(patchPresentation).toHaveBeenLastCalledWith(
      { view: view.id },
      { width: 120 },
    );
  });

  it("carries a change made while saving as into the new view", async () => {
    const indexedDB = new IDBFactory();
    const real = tab(indexedDB);
    const gate = deferred<void>();
    const views = viewsOf(
      providerOver({
        ...real,
        create: async (draft) => {
          await gate.promise;
          return real.create(draft);
        },
      }),
    );
    await listed(views);
    views.arrange({ width: 100 });
    const saving = views.saveAs("Wide");
    await vi.waitFor(() => {
      expect(views.state.get().operation?.status).toBe("pending");
    });
    views.arrange({ width: 150 });
    gate.resolve();
    const view = viewOf(await saving);
    expect(view.presentation).toEqual({ width: 100 });
    expect(views.state.get().presentation).toEqual({ width: 150 });
    await vi.waitFor(async () => {
      expect(await real.readPresentation({ view: view.id })).toEqual({
        width: 150,
      });
    });
  });

  it("drops a listing asked for before a view was saved, which does not know it", async () => {
    const stale = deferred<ViewList>();
    const created = storedView({ id: "new", name: "New" });
    const list = vi
      .fn<ViewStore["list"]>()
      .mockResolvedValueOnce({ views: [], unreadable: [] })
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValue({ views: [created], unreadable: [] });
    // A store tells this tab of its own writes, as the contract has it.
    let changed = (): void => {};
    const views = viewsOf(
      providerOver(
        standIn({
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
    await listed(views);
    views.reload();
    await views.saveAs("New");
    stale.resolve({ views: [], unreadable: [] });
    await new Promise((settle) => setTimeout(settle));
    expect(views.state.get().current).toEqual(created);
  });

  it("rejects only the operation whose state listener throws", async () => {
    const views = viewsOf(providerOver(standIn()));
    const stop = views.state.subscribe(() => {
      throw new Error("listener failed");
    });
    await expect(views.save()).rejects.toThrow("listener failed");
    stop();
    expect(await views.save()).toEqual({ status: "missing" });
  });
});
