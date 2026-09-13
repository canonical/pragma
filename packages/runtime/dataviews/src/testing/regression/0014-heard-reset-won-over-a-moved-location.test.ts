/**
 * Regression: a reset the loop already wrote must not win over a location
 * the reader moved while nothing observed.
 *
 * Before the fix, the next observation asked only whether the last move was
 * a reset — not whether the loop had already written it — so a provider
 * reset while observed, released, and observed again after the reader went
 * Back or opened a bookmark wrote the seed over the reader's URL and lost
 * their query.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare, declareSort } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createMemoryLocation } from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

describe("regression 0014 — a reset the loop heard leaves a moved location to the reader", () => {
  it("adopts the location the reader moved to after an observed reset", () => {
    const location = createMemoryLocation({ href: "/machines" });
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({ sort: declareSort(["cpu"]) }),
      }).source,
      location,
    });
    const first = provider.observe();
    provider.setSort([{ field: "cpu", direction: "desc" }]);
    provider.reset();
    expect(location.read().getAll("sort")).toEqual([]);
    first();

    // Back, while nothing observes.
    location.write(new URLSearchParams("sort=cpu__desc&page=1&size=50"));
    const second = provider.observe();
    expect(provider.state.get().slice.sort).toEqual([
      { field: "cpu", direction: "desc" },
    ]);
    expect(location.read().getAll("sort")).toEqual(["cpu__desc"]);
    second();
  });
});
