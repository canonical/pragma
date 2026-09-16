import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import createDeferred from "../../../testing/createDeferred.js";
import { createStandInPresentationStore } from "../../../testing/createStandInStores.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import openIndexedDBTab from "../../../testing/openIndexedDBTab.js";
import type { Deferred } from "../../../testing/types.js";
import { WRITE_DEADLINE, WRITE_DELAY } from "./constants.js";
import createMemoryPresentationStore from "./createMemoryPresentationStore.js";
import createPresentation from "./createPresentation.js";
import type {
  OwnedPresentation,
  PreferenceResult,
  PresentationState,
  PresentationStore,
} from "./types.js";

/**
 * The presentation over the IndexedDB store on `fake-indexeddb` — real
 * transactions, and two stores on one factory are two tabs — over a
 * stand-in store that rejects, answers late or reports a missing view on
 * cue, and over no store at all, where the same record runs in memory.
 */

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** A presentation with the store it runs over, for one script to run twice. */
type Scripted = {
  readonly store: PresentationStore;
  readonly presentation: OwnedPresentation;
};

const readArrangement = (presentation: OwnedPresentation) =>
  presentation.state.get().presentation;

describe("createPresentation", () => {
  it("reads nothing until observed, so a server render stays at the declared arrangement", () => {
    const readPresentation = vi.fn(async () => ({}));
    const subscribe = vi.fn(() => () => {});
    const presentation = createPresentation({
      store: createStandInPresentationStore({ readPresentation, subscribe }),
    });
    expect(presentation.state.get()).toEqual({
      presentation: {},
      own: {},
      presentationReason: null,
    });
    expect(readPresentation).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("publishes nothing for a change that moves nothing, and once for the view's own layer shown", () => {
    const presentation = createPresentation();
    let published = 0;
    presentation.state.subscribe(() => {
      published += 1;
    });
    presentation.arrange({ width: 120 });
    presentation.arrange({ width: 120 });
    const view = { id: "v1", presentation: { width: 120 } };
    presentation.show(view);
    presentation.show(view);
    // The arrangement in force is the same; the viewer's own layer is now the
    // view's, which holds nothing yet.
    expect(published).toBe(2);
    expect(presentation.state.get().own).toEqual({});
  });

  it("hands its state out read-only at runtime", () => {
    const { state } = createPresentation();
    expect(Object.isFrozen(state)).toBe(true);
    expect(state).not.toHaveProperty("set");
  });

  it("layers the default arrangement, the view's saved presentation and the viewer's changes to it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const store = openIndexedDBTab(new IDBFactory());
    await store.create({
      id: "v1",
      name: "Wide",
      query: "",
      presentation: {},
    });
    await store.patchPresentation("default", { density: "dense", width: 100 });
    await store.patchPresentation({ view: "v1" }, { order: ["owner"] });
    const presentation = createPresentation({ store });
    observeUntilFinished(presentation);
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({
        density: "dense",
        width: 100,
      });
    });
    presentation.show({
      id: "v1",
      presentation: { width: 200, order: ["name"] },
    });
    // The saved presentation applies at once; the view's own preferences
    // follow once read.
    expect(readArrangement(presentation)).toEqual({
      density: "dense",
      width: 200,
      order: ["name"],
    });
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({
        density: "dense",
        width: 200,
        order: ["owner"],
      });
    });
    presentation.show(null);
    expect(readArrangement(presentation)).toEqual({
      density: "dense",
      width: 100,
    });
  });

  it("keeps the same view's own changes when the view is revised, and shows another view's own", async () => {
    const readPresentation = vi.fn(async () => ({}));
    const presentation = createPresentation({
      store: createStandInPresentationStore({ readPresentation }),
    });
    observeUntilFinished(presentation);
    presentation.show({ id: "v1", presentation: {} });
    presentation.arrange({ width: 150 });
    presentation.show({ id: "v1", presentation: { density: "dense" } });
    expect(readArrangement(presentation)).toEqual({
      density: "dense",
      width: 150,
    });
    // Observing read the default; showing read the view's own; the
    // revision read nothing.
    expect(readPresentation).toHaveBeenCalledTimes(2);
    presentation.show({ id: "v2", presentation: {} });
    expect(readArrangement(presentation)).toEqual({});
    expect(readPresentation).toHaveBeenCalledTimes(3);
    // Back on the first view, its own changes are still there.
    presentation.show({ id: "v1", presentation: {} });
    expect(readArrangement(presentation)).toEqual({ width: 150 });
  });

  it("saves a change to the default arrangement while no view is shown, removals included", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const store = openIndexedDBTab(new IDBFactory());
    const presentation = createPresentation({ store });
    observeUntilFinished(presentation);
    presentation.arrange({ width: 120 });
    expect(readArrangement(presentation)).toEqual({ width: 120 });
    await vi.waitFor(async () => {
      expect(await store.readPresentation("default")).toEqual({ width: 120 });
    });
    presentation.arrange({ width: undefined });
    expect(readArrangement(presentation)).toEqual({});
    await vi.waitFor(async () => {
      expect(await store.readPresentation("default")).toEqual({});
    });
  });

  it("saves a change to the shown view's own preferences, never the default arrangement", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const store = openIndexedDBTab(new IDBFactory());
    await store.create({
      id: "v1",
      name: "Wide",
      query: "",
      presentation: {},
    });
    await store.patchPresentation("default", { width: 100 });
    const presentation = createPresentation({ store });
    observeUntilFinished(presentation);
    presentation.show({ id: "v1", presentation: { width: 120 } });
    presentation.arrange({ width: 180 });
    await vi.waitFor(async () => {
      expect(await store.readPresentation({ view: "v1" })).toEqual({
        width: 180,
      });
    });
    expect(await store.readPresentation("default")).toEqual({ width: 100 });
    expect(readArrangement(presentation)).toEqual({ width: 180 });
  });

  it("shows a change another tab makes to the arrangement", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const indexedDB = new IDBFactory();
    const store = openIndexedDBTab(indexedDB);
    const presentation = createPresentation({ store });
    observeUntilFinished(presentation);
    presentation.arrange({ width: 120 });
    await vi.waitFor(async () => {
      expect(await store.readPresentation("default")).toEqual({ width: 120 });
    });
    await openIndexedDBTab(indexedDB).patchPresentation("default", {
      width: 200,
    });
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({ width: 200 });
    });
  });

  it("keeps both changes when two tabs change different keys", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const indexedDB = new IDBFactory();
    const mine = createPresentation({ store: openIndexedDBTab(indexedDB) });
    const theirs = createPresentation({ store: openIndexedDBTab(indexedDB) });
    observeUntilFinished(mine);
    observeUntilFinished(theirs);
    mine.arrange({ "table.width.name": 120 });
    theirs.arrange({ "table.width.status": 80 });
    await vi.waitFor(() => {
      expect(readArrangement(mine)).toEqual({
        "table.width.name": 120,
        "table.width.status": 80,
      });
      expect(readArrangement(theirs)).toEqual(readArrangement(mine));
    });
  });

  it("keeps changes made while a read was out, removals included", async () => {
    const read = createDeferred<Record<string, number>>();
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation: () => read.promise,
      }),
    });
    observeUntilFinished(presentation);
    presentation.arrange({ width: 120, height: undefined });
    read.resolve({ width: 90, height: 30, depth: 4 });
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({ width: 120, depth: 4 });
    });
  });

  it("keeps a change a read began before, once the write it went out in has landed", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const read = createDeferred<Record<string, number>>();
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation: () => read.promise,
      }),
    });
    observeUntilFinished(presentation);
    presentation.arrange({ width: 120 });
    // The write goes out and lands while the read is still out. The read
    // brings a key of its own, so the wait is for the read to have landed.
    await vi.advanceTimersByTimeAsync(WRITE_DELAY);
    read.resolve({ width: 90, depth: 4 });
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({ width: 120, depth: 4 });
    });
  });

  it("keeps a newer change through a read that lands after the older write succeeded", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const older = createDeferred<PreferenceResult>();
    const newer = createDeferred<PreferenceResult>();
    const patchPresentation = vi
      .fn<PresentationStore["patchPresentation"]>()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise)
      .mockResolvedValue({ status: "saved" });
    let changed = (): void => {};
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation: async () => ({ width: 120, seen: 1 }),
        patchPresentation,
        subscribe: (listener) => {
          changed = listener;
          return () => {};
        },
      }),
    });
    observeUntilFinished(presentation);
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({ width: 120, seen: 1 });
    });
    presentation.arrange({ width: 120 });
    await vi.advanceTimersByTimeAsync(WRITE_DELAY);
    presentation.arrange({ width: 130 });
    await vi.advanceTimersByTimeAsync(WRITE_DELAY);
    expect(patchPresentation).toHaveBeenCalledTimes(2);
    // The older write lands; the newer key is still in flight, so the read
    // its notice brings — answering the older value — cannot take it back.
    // The read's own key shows the read has landed.
    older.resolve({ status: "saved" });
    presentation.arrange({ seen: undefined });
    await vi.advanceTimersByTimeAsync(WRITE_DELAY);
    changed();
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({ width: 130, seen: 1 });
    });
    newer.resolve({ status: "saved" });
  });

  it("reports the defaults' read failure before the shown view's", async () => {
    const readPresentation = vi
      .fn<PresentationStore["readPresentation"]>()
      .mockImplementation(async (target) => {
        throw new Error(
          target === "default" ? "defaults locked" : "view locked",
        );
      });
    const presentation = createPresentation({
      store: createStandInPresentationStore({ readPresentation }),
    });
    observeUntilFinished(presentation);
    presentation.show({ id: "v1", presentation: {} });
    await vi.waitFor(() => {
      expect(readPresentation).toHaveBeenCalledTimes(2);
    });
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBe(
        "defaults locked",
      );
    });
  });

  it("keeps a change not yet written through a read that began before it was", async () => {
    let changed = (): void => {};
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation: async () => ({ width: 90 }),
        subscribe: (listener) => {
          changed = listener;
          return () => {};
        },
      }),
    });
    observeUntilFinished(presentation);
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({ width: 90 });
    });
    presentation.arrange({ width: 120 });
    changed();
    await new Promise((settle) => setTimeout(settle));
    expect(readArrangement(presentation)).toEqual({ width: 120 });
  });

  it("takes only the latest read, whichever answers first", async () => {
    const reads: Deferred<Record<string, number>>[] = [];
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation: () => {
          const read = createDeferred<Record<string, number>>();
          reads.push(read);
          return read.promise;
        },
      }),
    });
    observeUntilFinished(presentation);
    presentation.show({ id: "v1", presentation: {} });
    // Observing read the default; showing read the view's own; refreshing
    // read both again.
    presentation.refresh();
    expect(reads).toHaveLength(4);
    reads[2]?.resolve({ width: 90 });
    reads[3]?.resolve({ own: 1 });
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({ width: 90, own: 1 });
    });
    reads[0]?.resolve({ stale: 1 });
    reads[1]?.resolve({ stale: 2 });
    await new Promise((settle) => setTimeout(settle));
    expect(readArrangement(presentation)).toEqual({ width: 90, own: 1 });
  });

  it("reports preferences it cannot read, and clears the report once it can", async () => {
    const readPresentation = vi
      .fn<PresentationStore["readPresentation"]>()
      .mockRejectedValueOnce(new Error("view storage is unavailable: blocked"))
      .mockResolvedValue({});
    const presentation = createPresentation({
      store: createStandInPresentationStore({ readPresentation }),
    });
    observeUntilFinished(presentation);
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBe(
        "view storage is unavailable: blocked",
      );
    });
    presentation.refresh();
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBeNull();
    });
  });

  it("reports the shown view's preferences it cannot read, apart from the defaults", async () => {
    const readPresentation = vi
      .fn<PresentationStore["readPresentation"]>()
      .mockImplementation(async (target) => {
        if (target !== "default") {
          throw new Error("view storage failed: the view's record is locked");
        }
        return {};
      });
    const presentation = createPresentation({
      store: createStandInPresentationStore({ readPresentation }),
    });
    observeUntilFinished(presentation);
    presentation.show({ id: "v1", presentation: {} });
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBe(
        "view storage failed: the view's record is locked",
      );
    });
    readPresentation.mockResolvedValue({});
    presentation.refresh();
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBeNull();
    });
  });

  it("drops a view's read that fails after the view has left", async () => {
    const late = createDeferred<Record<string, number>>();
    const readPresentation = vi
      .fn<PresentationStore["readPresentation"]>()
      .mockImplementation((target) =>
        target === "default" ? Promise.resolve({}) : late.promise,
      );
    const presentation = createPresentation({
      store: createStandInPresentationStore({ readPresentation }),
    });
    observeUntilFinished(presentation);
    presentation.show({ id: "v1", presentation: {} });
    presentation.show(null);
    late.reject(new Error("too late"));
    await new Promise((settle) => setTimeout(settle));
    expect(presentation.state.get().presentationReason).toBeNull();
  });

  it("ignores a read failure an earlier read reports late", async () => {
    const early = createDeferred<Record<string, number>>();
    const readPresentation = vi
      .fn<PresentationStore["readPresentation"]>()
      .mockReturnValueOnce(early.promise)
      .mockResolvedValue({});
    const presentation = createPresentation({
      store: createStandInPresentationStore({ readPresentation }),
    });
    observeUntilFinished(presentation);
    presentation.refresh();
    early.reject(new Error("too late"));
    await new Promise((settle) => setTimeout(settle));
    expect(presentation.state.get().presentationReason).toBeNull();
  });

  it("drops a change to a view the store no longer has: nothing reported, nothing retried", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const patchPresentation = vi.fn<PresentationStore["patchPresentation"]>(
      async () => ({ status: "missing" }),
    );
    const presentation = createPresentation({
      store: createStandInPresentationStore({ patchPresentation }),
    });
    const release = observeUntilFinished(presentation);
    presentation.show({ id: "gone", presentation: {} });
    presentation.arrange({ width: 120 });
    await vi.waitFor(() => {
      expect(patchPresentation).toHaveBeenCalledTimes(1);
    });
    await vi.advanceTimersByTimeAsync(WRITE_DEADLINE);
    // The session hears the view is gone and leaves it; the change left
    // with the view, and a refresh has nothing to write again — the
    // release flushes whatever gathered.
    presentation.show(null);
    expect(presentation.state.get()).toEqual({
      presentation: {},
      own: {},
      presentationReason: null,
    });
    presentation.refresh();
    release();
    expect(patchPresentation).toHaveBeenCalledTimes(1);
    // Shown again, the view starts from what the store has: nothing.
    presentation.show({ id: "gone", presentation: {} });
    expect(readArrangement(presentation)).toEqual({});
  });

  it("reports the shown view's read failure for that view alone", async () => {
    const readPresentation = vi
      .fn<PresentationStore["readPresentation"]>()
      .mockImplementation(async (target) => {
        if (target !== "default" && target.view === "a") {
          throw new Error("view storage failed: locked");
        }
        return {};
      });
    const presentation = createPresentation({
      store: createStandInPresentationStore({ readPresentation }),
    });
    const release = presentation.observe();
    presentation.show({ id: "a", presentation: {} });
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBe(
        "view storage failed: locked",
      );
    });
    release();
    // Shown unobserved, the next view reads nothing — and inherits no
    // failure from the last.
    presentation.show({ id: "b", presentation: {} });
    expect(presentation.state.get().presentationReason).toBeNull();
  });

  it("keeps a change it could not save, reported, through later reads, until retried", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const patchPresentation = vi
      .fn<PresentationStore["patchPresentation"]>()
      .mockRejectedValueOnce(new Error("view storage failed: quota exceeded"))
      .mockResolvedValue({ status: "saved" });
    let changed = (): void => {};
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        patchPresentation,
        subscribe: (listener) => {
          changed = listener;
          return () => {};
        },
      }),
    });
    observeUntilFinished(presentation);
    presentation.arrange({ width: 120 });
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBe(
        "view storage failed: quota exceeded",
      );
    });
    // Read again, and another key written: still unsaved, still reported.
    changed();
    presentation.arrange({ height: 1 });
    await vi.waitFor(() => {
      expect(patchPresentation).toHaveBeenCalledTimes(2);
    });
    await vi.advanceTimersByTimeAsync(WRITE_DEADLINE);
    expect(presentation.state.get()).toEqual({
      presentation: { width: 120, height: 1 },
      own: { width: 120, height: 1 },
      presentationReason: "view storage failed: quota exceeded",
    });
    presentation.refresh();
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBeNull();
    });
    expect(patchPresentation).toHaveBeenLastCalledWith("default", {
      width: 120,
    });
  });

  it("writes again the shown view's preferences whose write failed", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const patchPresentation = vi
      .fn<PresentationStore["patchPresentation"]>()
      .mockRejectedValueOnce(new Error("view storage failed"))
      .mockResolvedValue({ status: "saved" });
    const presentation = createPresentation({
      store: createStandInPresentationStore({ patchPresentation }),
    });
    presentation.show({ id: "v1", presentation: {} });
    presentation.arrange({ width: 120 });
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBe(
        "view storage failed",
      );
    });
    presentation.refresh();
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBeNull();
    });
    expect(patchPresentation).toHaveBeenLastCalledWith(
      { view: "v1" },
      { width: 120 },
    );
  });

  it("lets a later change own its key: an older write failing late reports nothing", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const older = createDeferred<PreferenceResult>();
    const patchPresentation = vi
      .fn<PresentationStore["patchPresentation"]>()
      .mockReturnValueOnce(older.promise)
      // The later write never settles: only the older one can report.
      .mockReturnValue(new Promise(() => {}));
    const presentation = createPresentation({
      store: createStandInPresentationStore({ patchPresentation }),
    });
    presentation.arrange({ width: 120 });
    await vi.waitFor(() => {
      expect(patchPresentation).toHaveBeenCalledTimes(1);
    });
    presentation.arrange({ width: 130 });
    older.reject(new Error("view storage failed"));
    await vi.waitFor(() => {
      expect(patchPresentation).toHaveBeenCalledTimes(2);
    });
    expect(presentation.state.get()).toEqual({
      presentation: { width: 130 },
      own: { width: 130 },
      presentationReason: null,
    });
  });

  it("writes a burst of changes to one target once, merged", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const patchPresentation = vi.fn<PresentationStore["patchPresentation"]>(
      async () => ({ status: "saved" }),
    );
    const presentation = createPresentation({
      store: createStandInPresentationStore({ patchPresentation }),
    });
    presentation.arrange({ width: 100 });
    presentation.arrange({ width: 110, height: 20 });
    presentation.arrange({ width: 120 });
    expect(readArrangement(presentation)).toEqual({ width: 120, height: 20 });
    await vi.advanceTimersByTimeAsync(WRITE_DELAY - 1);
    expect(patchPresentation).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(WRITE_DEADLINE);
    expect(patchPresentation.mock.calls).toEqual([
      ["default", { width: 120, height: 20 }],
    ]);
  });

  it("writes a burst that keeps coming at the deadline, then the rest when it stops", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const patchPresentation = vi.fn<PresentationStore["patchPresentation"]>(
      async () => ({ status: "saved" }),
    );
    const presentation = createPresentation({
      store: createStandInPresentationStore({ patchPresentation }),
    });
    // A key held down: a change every 100ms, each restarting the timer.
    for (let step = 1; step <= 12; step += 1) {
      presentation.arrange({ width: 100 + step });
      await vi.advanceTimersByTimeAsync(100);
    }
    // Written once at the deadline, a second after the first change.
    expect(patchPresentation.mock.calls).toEqual([["default", { width: 110 }]]);
    await vi.advanceTimersByTimeAsync(200);
    expect(patchPresentation.mock.calls).toEqual([
      ["default", { width: 110 }],
      ["default", { width: 112 }],
    ]);
  });

  it("writes the changes still gathering when the last observer releases, once", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const patchPresentation = vi.fn<PresentationStore["patchPresentation"]>(
      async () => ({ status: "saved" }),
    );
    const presentation = createPresentation({
      store: createStandInPresentationStore({ patchPresentation }),
    });
    const first = presentation.observe();
    const second = presentation.observe();
    presentation.arrange({ width: 100 });
    first();
    first();
    expect(patchPresentation).not.toHaveBeenCalled();
    second();
    expect(patchPresentation).toHaveBeenCalledWith("default", { width: 100 });
    // The timer that was gathering the change does not write it again.
    await vi.advanceTimersByTimeAsync(WRITE_DEADLINE);
    expect(patchPresentation).toHaveBeenCalledTimes(1);
  });

  it("settles a write still in flight at release into the layer it was made in", async () => {
    const writing = createDeferred<PreferenceResult>();
    const patchPresentation = vi
      .fn<PresentationStore["patchPresentation"]>()
      .mockReturnValueOnce(writing.promise)
      .mockResolvedValue({ status: "saved" });
    const presentation = createPresentation({
      store: createStandInPresentationStore({ patchPresentation }),
    });
    const release = presentation.observe();
    presentation.arrange({ width: 100 });
    release();
    expect(patchPresentation).toHaveBeenCalledTimes(1);
    // Observed again before the write lands: the read cannot outrun it.
    observeUntilFinished(presentation);
    writing.reject(new Error("view storage failed"));
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBe(
        "view storage failed",
      );
    });
    expect(readArrangement(presentation)).toEqual({ width: 100 });
  });

  it("stops hearing the store once the last observer releases", () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    const presentation = createPresentation({
      store: createStandInPresentationStore({ subscribe }),
    });
    const first = presentation.observe();
    const second = presentation.observe();
    expect(subscribe).toHaveBeenCalledTimes(1);
    first();
    expect(unsubscribe).not.toHaveBeenCalled();
    second();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  describe("without a store", () => {
    it("resizes and removes widths in memory, exactly as over a store, and claims nothing saved", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
      const presentation = createPresentation();
      observeUntilFinished(presentation);
      presentation.arrange({ "table.width.name": 120 });
      expect(readArrangement(presentation)).toEqual({
        "table.width.name": 120,
      });
      presentation.show({
        id: "v1",
        presentation: { "table.width.name": 300 },
      });
      expect(readArrangement(presentation)).toEqual({
        "table.width.name": 300,
      });
      presentation.arrange({ "table.width.name": 150 });
      presentation.show(null);
      expect(readArrangement(presentation)).toEqual({
        "table.width.name": 120,
      });
      // The view's own layer was kept for it: shown again, it is read back.
      presentation.show({
        id: "v1",
        presentation: { "table.width.name": 300 },
      });
      await vi.waitFor(() => {
        expect(readArrangement(presentation)).toEqual({
          "table.width.name": 150,
        });
      });
      presentation.arrange({ "table.width.name": undefined });
      expect(readArrangement(presentation)).toEqual({
        "table.width.name": 300,
      });
      expect(presentation.state.get().presentationReason).toBeNull();
    });

    it.each([
      [
        "in memory",
        async (): Promise<Scripted> => {
          const store = createMemoryPresentationStore();
          return { store, presentation: createPresentation({ store }) };
        },
      ],
      [
        "over IndexedDB",
        async (): Promise<Scripted> => {
          const store = openIndexedDBTab(new IDBFactory());
          // The view the script shows exists, so its own preferences are kept.
          await store.create({
            id: "v1",
            name: "Wide",
            query: "",
            presentation: {},
          });
          return { store, presentation: createPresentation({ store }) };
        },
      ],
    ])("runs one script to the same states %s", async (_where, make) => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
      const { store, presentation } = await make();
      const states: PresentationState[] = [];
      presentation.state.subscribe(() => {
        states.push(presentation.state.get());
      });
      observeUntilFinished(presentation);
      presentation.arrange({ width: 100, density: "dense" });
      presentation.show({ id: "v1", presentation: { width: 200 } });
      presentation.arrange({ width: 150 });
      presentation.show(null);
      presentation.arrange({ density: undefined });
      // The view's own change lands before the view is shown again, so
      // its read finds it.
      await vi.waitFor(async () => {
        expect(await store.readPresentation({ view: "v1" })).toEqual({
          width: 150,
        });
      });
      presentation.show({ id: "v1", presentation: { width: 200 } });
      await vi.waitFor(() => {
        expect(readArrangement(presentation)).toEqual({ width: 150 });
      });
      expect(states.map((state) => state.presentation)).toEqual([
        { width: 100, density: "dense" },
        { width: 200, density: "dense" },
        { width: 150, density: "dense" },
        { width: 100, density: "dense" },
        { width: 100 },
        { width: 150 },
      ]);
      expect(states.every((state) => state.presentationReason === null)).toBe(
        true,
      );
    });

    it("keeps the arrangement for the session, across observations", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
      const presentation = createPresentation();
      const release = presentation.observe();
      presentation.arrange({ density: "dense" });
      release();
      observeUntilFinished(presentation);
      await vi.advanceTimersByTimeAsync(WRITE_DEADLINE);
      expect(readArrangement(presentation)).toEqual({ density: "dense" });
    });
  });
});

describe("createPresentation restored", () => {
  it("draws a restored arrangement before anything observes, and keeps it for the session without a store", async () => {
    const restored = { "table.width.name": 240 };
    const presentation = createPresentation({
      restored: { view: null, presentation: restored },
    });
    expect(presentation.state.get()).toEqual({
      presentation: restored,
      own: restored,
      presentationReason: null,
    });
    expect(readArrangement(presentation)).not.toBe(restored);
    const release = presentation.observe();
    // The memory the session keeps holds it, so the first read, once it has
    // settled, keeps it.
    await new Promise((settle) => setTimeout(settle));
    expect(readArrangement(presentation)).toEqual(restored);
    // It is the default arrangement: removing its key returns to the
    // declared one.
    presentation.arrange({ "table.width.name": undefined });
    expect(readArrangement(presentation)).toEqual({});
    release();
  });

  it("lets the store decide once it answers", async () => {
    const store = createMemoryPresentationStore();
    await store.patchPresentation("default", { "table.order": ["cores"] });
    const presentation = createPresentation({
      store,
      restored: { view: null, presentation: { "table.width.name": 240 } },
    });
    expect(readArrangement(presentation)).toEqual({ "table.width.name": 240 });
    const release = presentation.observe();
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({
        "table.order": ["cores"],
      });
    });
    release();
  });

  it("draws an arrangement restored under a view until that view's own preferences answer, never as the default", async () => {
    const readPresentation = vi.fn(async () => ({}));
    const presentation = createPresentation({
      store: createStandInPresentationStore({ readPresentation }),
      restored: { view: "v1", presentation: { "table.hidden": ["cores"] } },
    });
    expect(readArrangement(presentation)).toEqual({
      "table.hidden": ["cores"],
    });
    const release = presentation.observe();
    // Reading the defaults, once it has settled, keeps it: they are not the
    // view's.
    await new Promise((settle) => setTimeout(settle));
    expect(readPresentation).toHaveBeenCalledTimes(1);
    expect(readArrangement(presentation)).toEqual({
      "table.hidden": ["cores"],
    });
    // The view shown with its saved arrangement: kept, until its own read.
    presentation.show({ id: "v1", presentation: { "table.order": ["name"] } });
    expect(readArrangement(presentation)).toEqual({
      "table.hidden": ["cores"],
      "table.order": ["name"],
    });
    await vi.waitFor(() => {
      expect(readArrangement(presentation)).toEqual({
        "table.order": ["name"],
      });
    });
    release();
  });

  it("lets go of an arrangement restored under a view when another view, or none, is shown", () => {
    const restored = {
      view: "v1",
      presentation: { "table.hidden": ["cores"] },
    };
    const other = createPresentation({ restored });
    other.show({ id: "v2", presentation: {} });
    expect(readArrangement(other)).toEqual({});
    const none = createPresentation({ restored });
    none.show(null);
    expect(readArrangement(none)).toEqual({});
  });

  it("lets go of an arrangement restored under a view when the view's own preferences fail to read", async () => {
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation: async (target) => {
          if (target === "default") {
            return {};
          }
          throw new Error("storage is blocked");
        },
      }),
      restored: { view: "v1", presentation: { "table.hidden": ["cores"] } },
    });
    const release = presentation.observe();
    presentation.show({ id: "v1", presentation: {} });
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).not.toBeNull();
    });
    expect(readArrangement(presentation)).toEqual({});
    release();
  });
});
