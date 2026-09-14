/**
 * Regression: a change made to one view's arrangement survives switching to
 * another view — reported and retried if its write fails, and shown again
 * when the view is.
 *
 * Before the fix, showing another view replaced the open view's layer with
 * a fresh one. A write still gathering or in flight settled into the
 * orphaned layer, so its failure was never reported, `refresh()` never
 * retried it, and showing the first view again read the store, which had
 * never received the change.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createStandInPresentationStore } from "../../../testing/createStandInStores.js";
import {
  createPresentation,
  type PresentationStore,
} from "../../lib/presentation/index.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("regression 0016 — a view's change lost with its layer", () => {
  it("reports and retries a failed write made to a view no longer shown", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const patchPresentation = vi
      .fn<PresentationStore["patchPresentation"]>()
      .mockRejectedValueOnce(new Error("view storage failed"))
      .mockResolvedValue({ status: "saved" });
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        patchPresentation,
      }),
    });
    const release = presentation.observe();
    presentation.show({ id: "a", presentation: null });
    presentation.arrange({ width: 150 });
    presentation.show({ id: "b", presentation: null });
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
      { view: "a" },
      { width: 150 },
    );
    // Shown again, the view keeps the change made to it before.
    presentation.show({ id: "a", presentation: null });
    expect(presentation.state.get().presentation).toEqual({ width: 150 });
    release();
  });
});
