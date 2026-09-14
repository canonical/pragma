/**
 * Regression: the write the last release flushes is not read back by a
 * presentation nothing observes any more.
 *
 * Before the fix, the release flushed before it stopped hearing the store,
 * so a store that tells its listeners of a write as it happens — the one
 * kept in memory does — had the presentation read both targets and publish
 * to nobody, a read begun after the last observer had gone.
 */

import { describe, expect, it, vi } from "vitest";
import { createStandInPresentationStore } from "../../../testing/createStandInStores.js";
import { createPresentation } from "../../lib/presentation/index.js";

describe("regression 0020 — the write at release was read back for nobody", () => {
  it("reads nothing after the last release, even as the release writes", async () => {
    const readPresentation = vi.fn(async () => ({}));
    const patchPresentation = vi.fn(async () => {
      for (const listener of listeners) {
        listener();
      }
      return { status: "saved" } as const;
    });
    const listeners = new Set<() => void>();
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation,
        patchPresentation,
        subscribe: (listener) => {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
      }),
    });
    const release = presentation.observe();
    expect(readPresentation).toHaveBeenCalledTimes(1);
    presentation.arrange({ width: 120 });
    release();
    expect(patchPresentation).toHaveBeenCalledTimes(1);
    await new Promise((settle) => setTimeout(settle));
    expect(readPresentation).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(0);
  });
});
