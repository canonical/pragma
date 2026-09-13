/**
 * Regression: two observations of one root's filter records must each be
 * released on their own.
 *
 * Before the fix, `observe()` subscribed the one shared sync function; the
 * channel keeps its listeners in a set, so the second observation
 * registered nothing and the first release deafened both — a mirror then
 * stayed empty when the query moved.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createFilterInputs } from "../../lib/filter/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";
import { DEFAULT_WINDOW, EMPTY_SLICE } from "../../lib/query/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

describe("regression 0011 — two observations of the filter records", () => {
  it("keeps following the query after the first release", () => {
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({ filter: { cpu: ["gte"] } }),
      }).source,
    });
    const host = readProviderHost(provider);
    const inputs = createFilterInputs({ host });
    const first = inputs.observe();
    const second = inputs.observe();
    first();
    host.adopt({
      slice: {
        ...EMPTY_SLICE,
        filter: [{ field: "cpu", operator: "gte", operands: [8] }],
      },
      window: DEFAULT_WINDOW,
    });
    expect(inputs.handles.cpu.gte.applied.get()).toEqual({
      kind: "value",
      value: 8,
    });
    second();
  });
});
