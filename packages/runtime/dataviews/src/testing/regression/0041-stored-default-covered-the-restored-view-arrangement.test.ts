/**
 * Regression: a stored default arrangement does not cover one restored under
 * a view.
 *
 * Before the fix, an arrangement restored under a view was drawn beneath the
 * default arrangement. Once the store's defaults were read, a stored value
 * for the same key covered the view's until the view opened, and the page
 * flashed the default arrangement in between.
 */

import { describe, expect, it, vi } from "vitest";
import { createStandInPresentationStore } from "../../../testing/createStandInStores.js";
import {
  createPresentation,
  type PresentationStore,
} from "../../lib/presentation/index.js";

describe("regression 0041 — a stored default covered the restored view arrangement", () => {
  it("draws the arrangement restored under a view over the stored default", async () => {
    const readPresentation = vi.fn<PresentationStore["readPresentation"]>(
      async (target) => (target === "default" ? { "table.hidden": [] } : {}),
    );
    const presentation = createPresentation({
      store: createStandInPresentationStore({ readPresentation }),
      restored: { view: "v1", presentation: { "table.hidden": ["cores"] } },
    });
    const release = presentation.observe();
    // The defaults' read settles: the presentation heard it first.
    expect(readPresentation).toHaveBeenCalledWith("default");
    await readPresentation.mock.results.at(0)?.value;
    expect(presentation.state.get().presentation).toEqual({
      "table.hidden": ["cores"],
    });
    release();
  });
});
