/**
 * Regression: adopting a query that moves only the window keeps the slice.
 *
 * Before the fix, adoption copied the slice whenever the query differed, a
 * move of the page alone included, so what reads the slice by identity saw a
 * new query: Back between two pages hid the facets until the page arrived.
 * An equal slice now keeps its identity.
 */

import { describe, expect, it } from "vitest";
import { pageOf } from "../../../testing/fixtures.js";
import { createQueryCoordinator } from "../../lib/coordinator/index.js";
import { DEFAULT_WINDOW, EMPTY_SLICE } from "../../lib/query/index.js";

describe("regression 0067 — window-only adoption dropped facets", () => {
  it("keeps the slice's identity when only the window moves", () => {
    const coordinator = createQueryCoordinator();
    const first = coordinator.adopt({
      slice: {
        ...EMPTY_SLICE,
        filter: [{ field: "status", operator: "isAny", operands: ["failed"] }],
      },
      window: DEFAULT_WINDOW,
    });
    coordinator.complete(first ?? "", {
      status: "succeeded",
      page: pageOf([]),
    });
    const before = coordinator.state.slice;
    const requestId = coordinator.adopt({
      slice: {
        ...EMPTY_SLICE,
        filter: [{ field: "status", operator: "isAny", operands: ["failed"] }],
      },
      window: { ...DEFAULT_WINDOW, page: 2 },
    });
    expect(requestId).not.toBeNull();
    expect(coordinator.state.window.page).toBe(2);
    expect(coordinator.state.slice).toBe(before);
    // The facets the first page answered still answer the query on screen.
    expect(coordinator.state.result.provenance?.slice).toBe(
      coordinator.state.slice,
    );
  });
});
