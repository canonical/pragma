/**
 * Regression: a choice whose options are the server's lists each option once.
 *
 * Before the fix, the options were the facet's values and the set's operands
 * compared by identity, so a facet listing the number 42 beside a set holding
 * "42" — the option as the wire reads it back — drew two checkboxes named 42,
 * one checked, under one key. Options are now listed by their text.
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
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Placed = { readonly id: string };

const places = createCollection({
  identify: (row: Placed) => row.id,
  fields: [{ field: "region", kind: "choices" }],
});

describe("regression 0033 — server-owned option listed twice", () => {
  it("draws one checkbox for an option the facet lists and the set holds", () => {
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
    const provider = createDataViewsProvider({
      collection: places,
      source: listing,
      facets: ["region"],
    });
    render(
      <DataViews provider={provider}>
        <DataViews.Filters />
      </DataViews>,
    );
    act(() => {
      readProviderHost(provider).adopt(
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
    expect(screen.getAllByRole("checkbox", { name: "42" })).toHaveLength(1);
  });
});
