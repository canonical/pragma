/**
 * Regression: a page answering the same facets keeps the facets published.
 *
 * Before the fix, every completion published a fresh copy of the facets, so
 * a control reading them by identity redrew on every page turn and refresh
 * though no count or bound had moved. Equal facets now keep their identity.
 */

import { describe, expect, it } from "vitest";
import { pageOf } from "../../../testing/fixtures.js";
import { createQueryCoordinator } from "../../lib/coordinator/index.js";
import type { Facet } from "../../lib/result/index.js";

const facets = {
  status: {
    kind: "values",
    values: [{ value: "failed", count: { kind: "exact", value: 2 } }],
  },
} satisfies Readonly<Record<string, Facet>>;

describe("regression 0070 — equal facets published as new ones", () => {
  it("keeps the facets' identity across a page answering the same", () => {
    const coordinator = createQueryCoordinator();
    const first = coordinator.refresh();
    coordinator.complete(first, {
      status: "succeeded",
      page: { ...pageOf([{ id: "a" }]), facets },
    });
    const published = coordinator.state.result.facets;
    const second = coordinator.refresh();
    coordinator.complete(second, {
      status: "succeeded",
      page: {
        ...pageOf([{ id: "b" }]),
        facets: {
          status: { ...facets.status, values: [...facets.status.values] },
        },
      },
    });
    expect(coordinator.state.result.facets).toBe(published);
    expect(coordinator.state.result.rows).toEqual([{ id: "b" }]);
  });
});
