/**
 * Regression: a change whose write is still in flight is kept through a
 * read that lands before the write is answered.
 *
 * Before the fix, a key was kept through a read only while its change was
 * newer than the last flush or its write had already failed. A store with
 * independent requests could answer a read begun after the write was sent
 * before answering the write, so the read reverted the change; when the
 * write then failed, the layer held the read's value and the retry sent a
 * removal instead of the change.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createStandInPresentationStore } from "../../../testing/createStandInStores.js";
import {
  createPresentation,
  type PreferenceResult,
  type PresentationStore,
} from "../../lib/presentation/index.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("regression 0017 — a read outran a failing write", () => {
  it("keeps the change, reports the failure and retries the change itself", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    let failWrite: (error: Error) => void = () => {};
    const patchPresentation = vi
      .fn<PresentationStore["patchPresentation"]>()
      .mockImplementationOnce(
        () =>
          new Promise<PreferenceResult>((_, reject) => {
            failWrite = reject;
          }),
      )
      .mockResolvedValue({ status: "saved" });
    let changed = (): void => {};
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation: async () => ({ width: 90 }),
        patchPresentation,
        subscribe: (listener) => {
          changed = listener;
          return () => {};
        },
      }),
    });
    const release = presentation.observe();
    await vi.waitFor(() => {
      expect(presentation.state.get().presentation).toEqual({ width: 90 });
    });
    presentation.arrange({ width: 120 });
    await vi.waitFor(() => {
      expect(patchPresentation).toHaveBeenCalledTimes(1);
    });
    // Another tab's notice: a read begun after the write was sent lands
    // first, still carrying the stored value.
    changed();
    await vi.advanceTimersByTimeAsync(0);
    expect(presentation.state.get().presentation).toEqual({ width: 120 });
    failWrite(new Error("500"));
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBe("500");
    });
    expect(presentation.state.get().presentation).toEqual({ width: 120 });
    presentation.refresh();
    await vi.waitFor(() => {
      expect(presentation.state.get().presentationReason).toBeNull();
    });
    expect(patchPresentation).toHaveBeenLastCalledWith("default", {
      width: 120,
    });
    release();
  });
});
