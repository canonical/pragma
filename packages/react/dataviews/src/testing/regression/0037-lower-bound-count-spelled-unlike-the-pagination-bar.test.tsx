/**
 * Regression: a count a source reports only a lower bound for reads "at least"
 * beside its option, as the pagination bar reads one.
 *
 * Before the fix, the count beside an option read "5+" while the pagination
 * bar spelled the same kind of count "at least 5", so a reader met one fact
 * in two spellings. Both now say "at least".
 */

import {
  createCollection,
  createDataViewsProvider,
  createPage,
  declareCapabilities,
  type Facet,
  type Source,
} from "@canonical/dataviews-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Row = { readonly id: string };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [{ field: "status", kind: "choices", options: ["failed", "ready"] }],
});

/** A source answering the status facet with the values and counts given. */
const createAnswering = (
  values: Extract<Facet, { readonly kind: "values" }>["values"],
): Source<Row> => ({
  capabilities: declareCapabilities(collection, {
    filter: { status: true },
    facets: ["status"],
  }),
  execute: (_request, deliver) => {
    deliver({
      status: "succeeded",
      page: createPage({
        rows: [],
        facets: { status: { kind: "values", values } },
      }),
    });
    return () => {};
  },
});

describe("regression 0037 — lower-bound count spelled unlike the pagination bar", () => {
  it("describes an option by at least its lower bound", () => {
    render(
      <DataViews
        provider={createDataViewsProvider({
          collection,
          source: createAnswering([
            { value: "failed", count: { kind: "at-least", value: 5 } },
          ]),
          facets: ["status"],
        })}
      >
        <DataViews.Filters />
      </DataViews>,
    );
    expect(
      screen.getByRole("checkbox", { name: "failed" }),
    ).toHaveAccessibleDescription("at least 5");
  });
});
