/**
 * A source mints a fresh facet for every request, and the provider keeps the
 * whole record only while every field's facet is unchanged — so a result that
 * moved the cores range handed the status chart a new facet object saying
 * exactly what the old one said, and the chart redrew every bar for it. The
 * chart holds its own facet by what it claims, not by its identity.
 *
 * The drawing counts its own renders here: nothing the DOM shows can tell a
 * redraw with identical output from no redraw at all.
 */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createFacetedManual } from "../../../testing/createFacetedProviders.js";
import deliverFacets from "../../../testing/deliverFacets.js";

/** Every set of values the drawing was asked to draw, in order. */
const drawn: unknown[] = [];

vi.mock(
  "../../lib/_work_in_progress/FacetBarChart/common/BarDrawing/BarDrawing.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../lib/_work_in_progress/FacetBarChart/common/BarDrawing/BarDrawing.js")
      >();
    const Drawing = actual.default;
    const { memo, createElement } = await import("react");
    return {
      default: memo((props: Parameters<typeof Drawing>[0]) => {
        drawn.push(props.values);
        return createElement(Drawing, props);
      }),
    };
  },
);

const { FacetBarChart } = await import(
  "../../lib/_work_in_progress/FacetBarChart/index.js"
);

/** One status facet, minted fresh each time, saying the same thing. */
const status = () =>
  ({
    kind: "values",
    values: [{ value: "failed", count: { kind: "exact", value: 4 } }],
  }) as const;

describe("a result that moved another field's facet", () => {
  it("redraws no bar of the chart that reads this one", () => {
    const { provider, source } = createFacetedManual();
    render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    deliverFacets(source, {
      status: status(),
      cores: { kind: "range", min: 1, max: 8 },
    });
    expect(drawn).toHaveLength(1);

    provider.refresh();
    // The same status counts, in a new object, beside a range that moved.
    deliverFacets(source, {
      status: status(),
      cores: { kind: "range", min: 1, max: 16 },
    });
    expect(drawn).toHaveLength(1);

    provider.refresh();
    // A status count that actually moved draws again.
    deliverFacets(source, {
      status: {
        kind: "values",
        values: [{ value: "failed", count: { kind: "exact", value: 5 } }],
      },
      cores: { kind: "range", min: 1, max: 16 },
    });
    expect(drawn).toHaveLength(2);
  });
});
