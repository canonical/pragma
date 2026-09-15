/**
 * Regression: a choice whose options are the server's checks the option its
 * set holds when the facet lists it as a number, and edits it as its text.
 *
 * Before the fix, the options kept the value the facet listed, so a remote
 * source answering the number 42 beside a set holding "42" — the option as
 * the wire reads it back — drew its checkbox unchecked while the restriction
 * stood, and checking it asked for the number, which a field whose options
 * are the server's refuses: the restriction could be neither seen nor made.
 * The server's options are now listed as their text.
 */

import {
  createCollection,
  createDataViewsProvider,
  createPage,
  DEFAULT_WINDOW,
  declareCapabilities,
  EMPTY_SLICE,
  type Source,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Placed = { readonly id: string };

const places = createCollection({
  identify: (row: Placed) => row.id,
  fields: [{ field: "region", kind: "choices" }],
});

/** A source listing the region 42 as a number, as a remote one may. */
const listing: Source<Placed> = {
  capabilities: declareCapabilities(places, {
    filter: { region: true },
    facets: ["region"],
  }),
  execute: (_request, deliver) => {
    deliver({
      status: "succeeded",
      page: createPage({
        rows: [],
        facets: {
          region: {
            kind: "values",
            values: [{ value: 42, count: { kind: "exact", value: 2 } }],
          },
        },
      }),
    });
    return () => {};
  },
};

describe("regression 0040 — server-owned number option drawn unchecked", () => {
  it("checks the option the set holds, and applies it again as its text", () => {
    const provider = createDataViewsProvider({
      collection: places,
      source: listing,
      facets: ["region"],
    });
    const host = readProviderHost(provider);
    render(
      <DataViews provider={provider}>
        <DataViews.Filters />
      </DataViews>,
    );
    act(() => {
      host.adopt(
        {
          slice: {
            ...EMPTY_SLICE,
            filter: [{ field: "region", operator: "isAny", operands: ["42"] }],
          },
          window: DEFAULT_WINDOW,
        },
        "adopt",
        null,
      );
    });
    expect(screen.getByRole("checkbox", { name: "42" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "42" }));
    expect(host.state.get().slice.filter).toEqual([]);
    fireEvent.click(screen.getByRole("checkbox", { name: "42" }));
    expect(host.state.get().slice.filter).toEqual([
      { field: "region", operator: "isAny", operands: ["42"] },
    ]);
  });
});
