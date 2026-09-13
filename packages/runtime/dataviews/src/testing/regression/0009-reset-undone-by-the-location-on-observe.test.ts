/**
 * Regression: a reset nothing observed must survive the next observation.
 *
 * Before the fix, a reset while no observer held the provider wrote nothing
 * to the location — no port was running — so the URL kept the query from
 * before, and the next observer adopted it: the generation had moved, the
 * seed had been published, and the old sort came straight back.
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

describe("regression 0009 — a reset nothing observed wins over the location", () => {
  it("writes the seed to the location on the next observe instead of adopting the old query", () => {
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
    expect(location.read().getAll("sort")).toEqual(["cpu__desc"]);
    first();

    provider.reset();
    const second = provider.observe();
    expect(provider.state.get().slice.sort).toEqual([]);
    expect(location.read().getAll("sort")).toEqual([]);
    second();
  });
});
