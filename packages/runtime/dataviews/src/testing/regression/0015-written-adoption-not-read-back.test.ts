/**
 * Regression: a clause adopted past the command boundary and written to the
 * location must be refused as a reload of that URL would refuse it.
 *
 * Before the fix, the loop wrote the spelling and took the echo as its own
 * without reading it, so a search the source cannot execute — adopted the
 * way a saved view is — stood in the query with no issue reported, while
 * the same URL reloaded refused it. State did not survive a reload.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createMemoryLocation } from "../../lib/location/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";
import { DEFAULT_WINDOW, EMPTY_SLICE } from "../../lib/query/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

describe("regression 0015 — a written adoption is read back", () => {
  it("refuses the unexecutable clause and narrows the query, keeping the URL", () => {
    const location = createMemoryLocation({ href: "/machines" });
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({ capabilities: declare({}) }).source,
      location,
    });
    const release = provider.observe();
    readProviderHost(provider).adopt(
      { slice: { ...EMPTY_SLICE, search: "abc" }, window: DEFAULT_WINDOW },
      "view",
      null,
    );
    expect(provider.issues.get()).toEqual([
      {
        parameter: "q",
        code: "undeclared-field",
        reason: "this source cannot search",
      },
    ]);
    expect(provider.state.get().slice.search).toBeNull();
    // The refused clause stands in the URL, for a reload to refuse again.
    expect(location.read().toString()).toBe("q=abc&page=1&size=50");
    release();
  });
});
