/**
 * Regression: the first page a provider asks for is pending, not a refresh.
 *
 * Before the fix, the provider asked for its first page through `refresh()`,
 * and the coordinator labelled every refresh `refreshing` — a status that
 * means "rows kept on display while the same query is asked again". A table
 * that had never shown a row reported it was refreshing them.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare, pageOf } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

describe("regression 0004 — the first page is pending, a later one refreshing", () => {
  it("reports the first request from idle as pending, and a refresh over rows as refreshing", () => {
    const source = createManualSource({ capabilities: declare({}) });
    const provider = createDataViewsProvider({
      collection: machines,
      source: source.source,
    });
    const release = provider.observe();
    expect(provider.state.get().result.status).toBe("pending");
    expect(provider.state.get().result.rows).toBeNull();
    source
      .callAt(0)
      .deliver({ status: "succeeded", page: pageOf([{ id: "a" }]) });
    expect(provider.state.get().result.status).toBe("ready");
    provider.refresh();
    expect(provider.state.get().result.status).toBe("refreshing");
    expect(provider.state.get().result.rows).toEqual([{ id: "a" }]);
    release();
  });
});
