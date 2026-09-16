/**
 * A count's label sat just past the end of its bar, so a long label on a bar
 * filling the axis — "at least 15,000" — ran off the drawing. A label with no
 * room left at the tip is anchored to the far edge instead.
 */

import { createPage } from "@canonical/dataviews-core";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createFacetedManual } from "../../../testing/createFacetedProviders.js";
import { machine } from "../../../testing/machines.js";
import { FacetBarChart } from "../../lib/_work_in_progress/FacetBarChart/index.js";

/** The drawing's own width, as the chart's viewBox states it. */
const WIDTH = 480;

describe("a count label with no room at its bar's tip", () => {
  it("is anchored to the drawing's far edge, not past it", () => {
    const { provider, source } = createFacetedManual();
    const { container } = render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    act(() => {
      source.latest().deliver({
        status: "succeeded",
        page: createPage({
          rows: [machine("m-1", "alpha")],
          matched: 1,
          total: 1,
          facets: {
            status: {
              kind: "values",
              values: [
                { value: "failed", count: { kind: "at-least", value: 15000 } },
                { value: "running", count: { kind: "exact", value: 1 } },
              ],
            },
            cores: { kind: "range", min: 1, max: 1 },
          },
        }),
      });
    });
    const labels = [...container.querySelectorAll(".value")];
    const longest = labels.at(0);
    expect(longest).toHaveTextContent("at least 15,000");
    expect(longest).toHaveAttribute("text-anchor", "end");
    expect(Number(longest?.getAttribute("x"))).toBeLessThanOrEqual(WIDTH);
    // The short bar's label still sits at its tip.
    expect(labels.at(1)).toHaveAttribute("text-anchor", "start");
  });
});
