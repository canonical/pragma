/**
 * A range whose ends are numbers but not finite — a NaN a source computed
 * over no value, or an infinity — passed the chart's check, and the drawing
 * then divided by a length of nothing: every marker, the band and every tick
 * took a coordinate of NaN, so the axis drew nothing at all while its table
 * still showed the ends. Such a range says what a range of nothing says.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createFacetedManual } from "../../../testing/createFacetedProviders.js";
import deliverFacets from "../../../testing/deliverFacets.js";
import { FacetRangeChart } from "../../lib/_work_in_progress/FacetRangeChart/index.js";

/** The ends a source should never answer with, and once did. */
const unusable: readonly (readonly [number, number])[] = [
  [Number.NaN, Number.NaN],
  [0, Number.POSITIVE_INFINITY],
  [Number.NEGATIVE_INFINITY, 8],
];

describe("a range whose ends are not finite", () => {
  it("says no matching record holds a value, and draws no axis", () => {
    for (const [min, max] of unusable) {
      const { provider, source } = createFacetedManual();
      const { unmount } = render(
        <FacetRangeChart provider={provider} field="cores" label="Cores" />,
      );
      deliverFacets(source, {
        status: { kind: "values", values: [] },
        cores: { kind: "range", min, max },
      });
      expect(
        screen.getByText("No matching record holds a value."),
        `${min} to ${max}`,
      ).toBeInTheDocument();
      expect(screen.queryByRole("img")).toBeNull();
      unmount();
    }
  });

  it("still draws a range whose ends are finite", () => {
    const { provider, source } = createFacetedManual();
    render(<FacetRangeChart provider={provider} field="cores" label="Cores" />);
    deliverFacets(source, {
      status: { kind: "values", values: [] },
      cores: { kind: "range", min: 2, max: 8 },
    });
    expect(
      screen.getByRole("img", { name: "Cores: a range chart from 2 to 8" }),
    ).toBeInTheDocument();
  });
});
