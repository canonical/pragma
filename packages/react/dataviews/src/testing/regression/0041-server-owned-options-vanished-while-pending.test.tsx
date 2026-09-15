/**
 * Regression: a choice whose options are the server's keeps listing them
 * while a query is pending.
 *
 * Before the fix, the options were read from the facets answering the
 * applied query alone, which are unknown while it is pending: checking one
 * option of an asynchronous source took every other away until the answer
 * landed, so the checkbox a reader was on could leave under them, and More
 * filters could close over nothing. The options are now listed from the
 * facets the latest result answered, the counts still only from those
 * answering the applied query.
 */

import {
  createCollection,
  createDataViewsProvider,
  createPage,
  declareCapabilities,
} from "@canonical/dataviews-core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import type { FacetValue } from "../../../testing/types.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Placed = { readonly id: string };

const places = createCollection({
  identify: (row: Placed) => row.id,
  fields: [{ field: "region", kind: "choices" }],
});

/** A provider over a source a case answers by hand, mounted in Filters. */
const mountManual = () => {
  const manual = createManualSource<Placed>({
    capabilities: declareCapabilities(places, {
      filter: { region: true },
      facets: ["region"],
    }),
  });
  const provider = createDataViewsProvider({
    collection: places,
    source: manual.source,
    facets: ["region"],
  });
  render(
    <DataViews provider={provider}>
      <DataViews.Filters />
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
  return { answerWith };
};

describe("regression 0041 — server-owned options vanished while pending", () => {
  it("keeps every option while a query is pending, and focus on the one unchecked", () => {
    const { answerWith } = mountManual();
    answerWith([
      { value: "eu", count: { kind: "exact", value: 2 } },
      { value: "us", count: { kind: "exact", value: 1 } },
    ]);
    const eu = screen.getByRole("checkbox", { name: "eu" });
    eu.focus();
    fireEvent.click(eu);
    // Pending: still listed, its count not yet known.
    expect(screen.getByRole("checkbox", { name: "us" })).not.toHaveAttribute(
      "aria-describedby",
    );
    fireEvent.click(eu);
    expect(screen.getByRole("checkbox", { name: "eu" })).toHaveFocus();
  });

  it("keeps More filters drawn over the server's options while a query is pending", () => {
    const zoned = createCollection({
      identify: (row: Placed) => row.id,
      fields: [
        { field: "status", kind: "choices", options: ["failed", "ready"] },
        { field: "region", kind: "choices" },
      ],
    });
    const manual = createManualSource<Placed>({
      capabilities: declareCapabilities(zoned, {
        filter: { status: true, region: true },
        facets: ["region"],
      }),
    });
    const { container } = render(
      <DataViews
        provider={createDataViewsProvider({
          collection: zoned,
          source: manual.source,
          facets: ["region"],
        })}
      >
        <DataViews.Filters primary={["status"]} />
      </DataViews>,
    );
    act(() => {
      manual.latest().deliver({
        status: "succeeded",
        page: createPage({
          rows: [],
          facets: {
            region: {
              kind: "values",
              values: [{ value: "eu", count: { kind: "exact", value: 1 } }],
            },
          },
        }),
      });
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
    // Pending: the region's options are still listed, so still disclosed.
    const details = container.querySelector("details");
    expect(details?.open).toBe(false);
    expect(details).toContainElement(
      screen.getByRole("checkbox", { name: "eu", hidden: true }),
    );
  });
});
