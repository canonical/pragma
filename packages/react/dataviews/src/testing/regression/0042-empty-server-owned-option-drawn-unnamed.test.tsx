/**
 * Regression: a choice whose options are the server's lists no empty option.
 *
 * Before the fix, a facet counting records holding the empty text drew a
 * checkbox with no name, and checking it applied a restriction the wire
 * spells as a blank value, which reads back as no restriction: a reload, or
 * a submission before any script runs, silently widened the query. An empty
 * value a facet lists is no longer offered as an option.
 */

import {
  createCollection,
  createDataViewsProvider,
  createPage,
  declareCapabilities,
  type Source,
} from "@canonical/dataviews-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Placed = { readonly id: string };

const places = createCollection({
  identify: (row: Placed) => row.id,
  fields: [{ field: "region", kind: "choices" }],
});

describe("regression 0042 — empty server-owned option drawn unnamed", () => {
  it("offers the options a facet lists, less the empty one", () => {
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
                values: [
                  { value: "", count: { kind: "exact", value: 1 } },
                  { value: "eu", count: { kind: "exact", value: 1 } },
                ],
              },
            },
          }),
        });
        return () => {};
      },
    };
    render(
      <DataViews
        provider={createDataViewsProvider({
          collection: places,
          source: listing,
          facets: ["region"],
        })}
      >
        <DataViews.Filters />
      </DataViews>,
    );
    expect(screen.getAllByRole("checkbox")).toEqual([
      screen.getByRole("checkbox", { name: "eu" }),
    ]);
  });
});
