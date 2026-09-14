/**
 * Regression: showing a view reads the store only while the presentation
 * is observed.
 *
 * Before the fix, showing a view read the store whether or not anything
 * observed the presentation, against the rule that nothing reads a store
 * before `observe()`: a host opening a view before mounting read twice, and
 * a server that opened one would have read the browser's storage.
 */

import { describe, expect, it, vi } from "vitest";
import { createStandInPresentationStore } from "../../../testing/createStandInStores.js";
import { createPresentation } from "../../lib/presentation/index.js";

describe("regression 0019 — a view shown read the store unobserved", () => {
  it("reads nothing until observed, then reads the shown view with the defaults", async () => {
    const readPresentation = vi.fn(async () => ({}));
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation,
      }),
    });
    presentation.show({ id: "v1", presentation: { width: 200 } });
    expect(readPresentation).not.toHaveBeenCalled();
    expect(presentation.state.get().presentation).toEqual({ width: 200 });
    const release = presentation.observe();
    expect(readPresentation.mock.calls).toEqual([
      ["default"],
      [{ view: "v1" }],
    ]);
    release();
    await Promise.resolve();
  });
});
