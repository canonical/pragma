/**
 * Regression: the More filters disclosure stays open for as long as its
 * placement is pinned.
 *
 * Before the fix, the pin copied the disclosure's open state, but the
 * disclosure was drawn only while it held a control and its open state was
 * the element's own. A query moving while it was open could leave nothing
 * inside — a choice whose options are the server's, once its facet listed
 * none — and the element left with no toggle, keeping the pin. It came back
 * closed under a placement still pinned open, where a restriction could be
 * placed out of sight. The disclosure is now open exactly while pinned, and
 * kept while pinned.
 */

import {
  createCollection,
  createDataViewsProvider,
  createPage,
  DEFAULT_WINDOW,
  declareCapabilities,
  EMPTY_SLICE,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import toggleDisclosure from "../../../testing/toggleDisclosure.js";
import type { FacetValue } from "../../../testing/types.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Placed = { readonly id: string };

const places = createCollection({
  identify: (row: Placed) => row.id,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "region", kind: "choices" },
  ],
});

/** The region facet listing one region. */
const ONE_REGION: readonly FacetValue[] = [
  { value: "eu", count: { kind: "exact", value: 1 } },
];

describe("regression 0039 — pin outlived the More filters disclosure", () => {
  it("keeps the disclosure open while its placement is pinned, whatever is left inside", async () => {
    const manual = createManualSource<Placed>({
      capabilities: declareCapabilities(places, {
        filter: { status: true, region: true },
        facets: ["region"],
      }),
    });
    const provider = createDataViewsProvider({
      collection: places,
      source: manual.source,
      facets: ["region"],
    });
    const { container } = render(
      <DataViews provider={provider}>
        <DataViews.Filters primary={["status"]} />
      </DataViews>,
    );
    /** Answer the latest request with the region facet's values. */
    const answerWith = (values: readonly FacetValue[]): void => {
      act(() => {
        manual.latest().deliver({
          status: "succeeded",
          page: createPage({
            rows: [],
            facets: { region: { kind: "values", values } },
          }),
        });
      });
    };
    answerWith(ONE_REGION);
    await toggleDisclosure(container, true);
    act(() => {
      readProviderHost(provider).adopt(
        {
          slice: {
            ...EMPTY_SLICE,
            filter: [
              { field: "status", operator: "isAny", operands: ["failed"] },
            ],
          },
          window: DEFAULT_WINDOW,
        },
        "adopt",
        null,
      );
    });
    answerWith([]);
    // No facet lists the region's options any more, so nothing is inside.
    expect(container.querySelector("details")?.open).toBe(true);
    // Closed, the pin is released, and a disclosure holding nothing leaves.
    await toggleDisclosure(container, false);
    expect(container.querySelector("details")).toBeNull();
  });
});
