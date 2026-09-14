/**
 * Regression: a view's own preferences failing to read after the view has
 * left are reported to nobody.
 *
 * Before the fix, leaving a view retired its read only when the store next
 * announced a change or a refresh ran; a read of the view still out when
 * the view left could fail late and set the reason on an arrangement that
 * no longer showed the view.
 */

import { describe, expect, it } from "vitest";
import createDeferred from "../../../testing/createDeferred.js";
import { createStandInPresentationStore } from "../../../testing/createStandInStores.js";
import { createPresentation } from "../../lib/presentation/index.js";

describe("regression 0022 — a left view's read reported late", () => {
  it("drops the failure of a read the shown view no longer needs", async () => {
    const late = createDeferred<Record<string, never>>();
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation: (target) =>
          target === "default" ? Promise.resolve({}) : late.promise,
      }),
    });
    const release = presentation.observe();
    presentation.show({ id: "v1", presentation: null });
    presentation.show(null);
    late.reject(new Error("view storage failed: too late"));
    await new Promise((settle) => setTimeout(settle));
    expect(presentation.state.get().presentationReason).toBeNull();
    release();
  });
});
