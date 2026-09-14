/**
 * Regression: a refresh nothing observes starts no source that must wait.
 *
 * Before the fix, `refresh()` on a provider nothing observed executed the
 * request and released it at once. A source that answers only after a
 * round trip — a query client, a Relay environment — started a fetch that
 * nobody would hear, on the server once per render, and the first observer
 * in the browser then fetched the same page again.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

describe("regression 0031 — a server refresh started a waiting source", () => {
  it("starts nothing, and the first observer asks once", () => {
    const source = createManualSource({ capabilities: declare({}) });
    const provider = createDataViewsProvider({
      collection: machines,
      source: source.source,
    });
    provider.refresh();
    expect(source.calls).toHaveLength(0);
    expect(provider.state.get().result.status).toBe("pending");

    const release = provider.observe();
    expect(source.calls).toHaveLength(1);
    expect(source.callAt(0).request.requestId).toBe(
      provider.state.get().pendingRequestId,
    );
    release();
  });
});
