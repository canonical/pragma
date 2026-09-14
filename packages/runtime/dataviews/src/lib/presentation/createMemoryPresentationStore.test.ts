import { describe, expect, it, vi } from "vitest";
import createMemoryPresentationStore from "./createMemoryPresentationStore.js";

describe("createMemoryPresentationStore", () => {
  it("starts holding a restored arrangement at the view it was drawn under, or as the default", async () => {
    const presentation = { "table.width.name": 240 };
    const store = createMemoryPresentationStore({
      restored: { view: null, presentation },
    });
    expect(await store.readPresentation("default")).toEqual(presentation);
    expect(await store.readPresentation({ view: "v1" })).toEqual({});
    await store.patchPresentation("default", { "table.width.name": undefined });
    expect(await store.readPresentation("default")).toEqual({});
    // The arrangement given is copied, never written through.
    expect(presentation).toEqual({ "table.width.name": 240 });
    const underView = createMemoryPresentationStore({
      restored: { view: "v1", presentation },
    });
    expect(await underView.readPresentation({ view: "v1" })).toEqual(
      presentation,
    );
    expect(await underView.readPresentation("default")).toEqual({});
  });

  it("reads nothing at a target until something is written there", async () => {
    const store = createMemoryPresentationStore();
    expect(await store.readPresentation("default")).toEqual({});
    expect(await store.readPresentation({ view: "v1" })).toEqual({});
  });

  it("keeps one record per key per target, and removes a key set to undefined", async () => {
    const store = createMemoryPresentationStore();
    await store.patchPresentation("default", { width: 100, density: "dense" });
    await store.patchPresentation({ view: "v1" }, { width: 200 });
    await store.patchPresentation("default", {
      width: 120,
      density: undefined,
    });
    expect(await store.readPresentation("default")).toEqual({ width: 120 });
    expect(await store.readPresentation({ view: "v1" })).toEqual({
      width: 200,
    });
  });

  it("answers every write as saved, whatever view it names", async () => {
    const store = createMemoryPresentationStore();
    expect(
      await store.patchPresentation({ view: "nothing" }, { width: 1 }),
    ).toEqual({ status: "saved" });
  });

  it("tells its listeners of a write before the write resolves, until they unsubscribe", async () => {
    const store = createMemoryPresentationStore();
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    const writing = store.patchPresentation("default", { width: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    await writing;
    stop();
    await store.patchPresentation("default", { width: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
