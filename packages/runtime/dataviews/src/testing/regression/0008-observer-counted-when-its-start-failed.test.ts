/**
 * Regression: an observer whose start failed must hold nothing.
 *
 * Before the fix, `observe()` counted the observer before starting the
 * ports; a port that threw — a store whose subscription fails — left the
 * count at one with nothing to stop, the ports started before it running
 * for nobody, and every later observer finding a provider that would never
 * start again.
 */

import { describe, expect, it } from "vitest";
import createCountingViewStore from "../../../testing/createCountingViewStore.js";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createMemoryLocation } from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

describe("regression 0008 — an observer whose start failed holds nothing", () => {
  it("stops the ports it started, counts no observer, and starts on the next", () => {
    let refuse = true;
    const { store } = createCountingViewStore({
      onSubscribe: () => {
        if (refuse) {
          throw new Error("storage is unavailable");
        }
      },
    });
    const source = createManualSource({ capabilities: declare({}) });
    const location = createMemoryLocation({ href: "/machines" });
    const provider = createDataViewsProvider({
      collection: machines,
      source: source.source,
      location,
      views: store,
    });
    expect(() => provider.observe()).toThrow("storage is unavailable");
    // The location and the source were started before the store refused;
    // both are stopped again, and nothing is left running for nobody.
    expect(source.calls).toHaveLength(0);
    refuse = false;
    const release = provider.observe();
    expect(source.calls).toHaveLength(1);
    expect(source.callAt(0).releases).toBe(0);
    release();
    expect(source.callAt(0).releases).toBe(1);
  });
});
