/**
 * A facet listing no value at all, over records the query matched, drew a
 * figure holding its caption and nothing else: no drawing, no table, no word
 * about why. And where every value was counted zero, the count axis stepped
 * in halves, as though half a record could hold a value.
 */

import { createPage } from "@canonical/dataviews-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createFacetedManual } from "../../../testing/createFacetedProviders.js";
import { machine } from "../../../testing/machines.js";
import { FacetBarChart } from "../../lib/_work_in_progress/FacetBarChart/index.js";

/** Answer the source's latest request with one machine and this status facet. */
const answer = (
  source: ReturnType<typeof createFacetedManual>["source"],
  values: readonly { value: string; count: { kind: "exact"; value: number } }[],
): void => {
  act(() => {
    source.latest().deliver({
      status: "succeeded",
      page: createPage({
        rows: [machine("m-1", "alpha")],
        matched: 1,
        total: 1,
        facets: {
          status: { kind: "values", values },
          cores: { kind: "range", min: 1, max: 1 },
        },
      }),
    });
  });
};

describe("a bar chart of a facet with nothing in it", () => {
  it("says no matching record holds a value", () => {
    const { provider, source } = createFacetedManual();
    render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    answer(source, []);
    expect(
      screen.getByText("No matching record holds a value."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("steps its axis in whole records where every count is zero", () => {
    const { provider, source } = createFacetedManual();
    const { container } = render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    answer(source, [{ value: "failed", count: { kind: "exact", value: 0 } }]);
    expect(
      [...container.querySelectorAll(".tick")].map((tick) => tick.textContent),
    ).toEqual(["0", "1", "2", "3", "4"]);
  });
});
