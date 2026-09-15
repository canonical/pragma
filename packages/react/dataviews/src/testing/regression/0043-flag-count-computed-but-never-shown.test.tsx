/**
 * Regression: a flag filter shows how many matching records set its
 * field.
 *
 * Before the fix, a source computed the facet of a flag field when asked
 * — the records setting it, counted — and Filters never read it: the
 * checkbox stood without the count a choice's options show beside them. The
 * count now describes the checkbox while the result answers the applied
 * query, and reads none where the facet lists no record setting the field.
 */

import {
  type Count,
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

type Owned = { readonly id: string };

const owned = createCollection({
  identify: (row: Owned) => row.id,
  fields: [{ field: "owner", kind: "flag" }],
});

describe("regression 0043 — flag count computed but never shown", () => {
  it("describes the checkbox with the count answering the applied query", () => {
    const manual = createManualSource<Owned>({
      capabilities: declareCapabilities(owned, {
        filter: { owner: true },
        facets: ["owner"],
      }),
    });
    render(
      <DataViews
        provider={createDataViewsProvider({
          collection: owned,
          source: manual.source,
          facets: ["owner"],
        })}
      >
        <DataViews.Filters />
      </DataViews>,
    );
    /** Answer the latest request with the owner facet's values. */
    const answerWith = (values: readonly FacetValue[]): void => {
      act(() => {
        manual.latest().deliver({
          status: "succeeded",
          page: createPage({
            rows: [],
            facets: { owner: { kind: "values", values } },
          }),
        });
      });
    };
    answerWith([{ value: true, count: { kind: "exact", value: 3 } }]);
    const owner = screen.getByRole("checkbox", { name: "owner" });
    expect(owner).toHaveAccessibleDescription("3");
    fireEvent.click(owner);
    // Pending: the count the applied query answers is not yet known.
    expect(owner).not.toHaveAttribute("aria-describedby");
    answerWith([]);
    expect(owner).toHaveAccessibleDescription("0");
  });

  it.each<[Count, string | null]>([
    [{ kind: "at-least", value: 5 }, "at least 5"],
    [{ kind: "unknown" }, null],
  ])("spells the count %o as %s", (count, spelled) => {
    const answering = createManualSource<Owned>({
      capabilities: declareCapabilities(owned, {
        filter: { owner: true },
        facets: ["owner"],
      }),
      answer: () =>
        createPage({
          rows: [],
          facets: {
            owner: { kind: "values", values: [{ value: true, count }] },
          },
        }),
    });
    render(
      <DataViews
        provider={createDataViewsProvider({
          collection: owned,
          source: answering.source,
          facets: ["owner"],
        })}
      >
        <DataViews.Filters />
      </DataViews>,
    );
    const owner = screen.getByRole("checkbox", { name: "owner" });
    if (spelled === null) {
      expect(owner).not.toHaveAttribute("aria-describedby");
    } else {
      expect(owner).toHaveAccessibleDescription(spelled);
    }
  });
});
