/**
 * Regression: a snapshot query that is not text is read as none.
 *
 * Before the fix, a snapshot's query was trusted as text. A snapshot parsed
 * from a page carrying `"query": [1]` threw while the provider was built,
 * and `"query": null` was read as a parameter named `null`.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import { EMPTY_SLICE } from "../../lib/query/index.js";
import type { DataViewsSnapshot } from "../../lib/snapshot/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "status", kind: "choices", options: ["failed"] }],
});

describe("regression 0036 — a snapshot query was trusted as text", () => {
  it.each([
    '{"query":[1],"presentation":{}}',
    '{"query":null,"presentation":{}}',
  ])("builds on %s at the empty query", (text) => {
    const snapshot: DataViewsSnapshot = JSON.parse(text);
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({ capabilities: declare({}) }).source,
      snapshot,
    });
    expect(provider.state.get().slice).toEqual(EMPTY_SLICE);
    expect(provider.issues.get()).toEqual([]);
  });
});
