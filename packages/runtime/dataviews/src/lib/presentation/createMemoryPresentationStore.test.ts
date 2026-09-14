import { describe, expect, it, vi } from "vitest";
import createMemoryPresentationStore from "./createMemoryPresentationStore.js";

describe("createMemoryPresentationStore", () => {
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
