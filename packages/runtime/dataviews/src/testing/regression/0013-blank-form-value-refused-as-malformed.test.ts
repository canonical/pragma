/**
 * Regression: a blank value in the location must read as no clause.
 *
 * Before the fix, an owned parameter with an empty value — `cpu__gte=`, as
 * a native GET form submits every bound nobody typed in — was refused as
 * malformed and left standing, so the filters' baseline form could never
 * be submitted cleanly: four empty bounds meant four visible refusals and
 * a location the loop would not respell.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createMemoryLocation } from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "cpu", kind: "number", min: 0, max: 64 },
  ],
});

describe("regression 0013 — a blank form value is no clause", () => {
  it("adopts a GET submission with empty bounds, reports nothing and respells it", () => {
    const location = createMemoryLocation({
      href: "/machines?status=failed&cpu__gte=&cpu__lte=&q=&page=1&size=50",
    });
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({
          filter: { status: ["isAny"], cpu: ["gte", "lte"] },
          search: { fields: ["name"] },
        }),
      }).source,
      location,
    });
    const release = provider.observe();
    expect(provider.issues.get()).toEqual([]);
    expect(provider.state.get().slice).toEqual({
      filter: [{ field: "status", operator: "isAny", operands: ["failed"] }],
      search: null,
      sort: [],
      group: [],
    });
    // Clean, so respelled canonically in place.
    expect(location.read().toString()).toBe("status=failed&page=1&size=50");
    release();
  });
});
