/**
 * Regression: showing a view reads the view's own preferences and nothing
 * else; showing none reads nothing.
 *
 * Before the fix, every change of the shown view read the default
 * arrangement again as well, though nothing about it had changed: two
 * storage transactions where one, or none, was due.
 */

import { describe, expect, it, vi } from "vitest";
import { createStandInPresentationStore } from "../../../testing/createStandInStores.js";
import { createPresentation } from "../../lib/presentation/index.js";

describe("regression 0021 — a view shown re-read the defaults", () => {
  it("reads the shown view's target alone, and nothing on leaving it", () => {
    const readPresentation = vi.fn(async () => ({}));
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation,
      }),
    });
    const release = presentation.observe();
    readPresentation.mockClear();
    presentation.show({ id: "v1", presentation: null });
    expect(readPresentation.mock.calls).toEqual([[{ view: "v1" }]]);
    presentation.show(null);
    expect(readPresentation).toHaveBeenCalledTimes(1);
    release();
  });
});
