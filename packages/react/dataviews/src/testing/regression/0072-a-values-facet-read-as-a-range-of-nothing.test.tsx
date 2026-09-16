/**
 * The range chart read a facet of values — which a source should never answer
 * for a number field — as a range with no ends, and said no matching record
 * held a value. That is false: the records hold values the source counted
 * rather than measured. A facet of the wrong kind is refused, as the bar
 * chart refuses a range.
 */

import { createPage } from "@canonical/dataviews-core";
import { act, render } from "@testing-library/react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { createFacetedManual } from "../../../testing/createFacetedProviders.js";
import { machine } from "../../../testing/machines.js";
import { FacetRangeChart } from "../../lib/_work_in_progress/FacetRangeChart/index.js";

describe("a number field answered with a facet of values", () => {
  it("is refused rather than drawn as no value at all", () => {
    // React reports the thrown render to the console before rethrowing it.
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => {
      errors.mockRestore();
    });
    const { provider, source } = createFacetedManual();
    const draw = (): void => {
      render(
        <FacetRangeChart provider={provider} field="cores" label="Cores" />,
      );
    };
    draw();
    expect(() => {
      act(() => {
        source.latest().deliver({
          status: "succeeded",
          page: createPage({
            rows: [machine("m-1", "alpha")],
            matched: 1,
            total: 1,
            facets: {
              cores: {
                kind: "values",
                values: [{ value: 4, count: { kind: "exact", value: 1 } }],
              },
            },
          }),
        });
      });
    }).toThrow('FacetRangeChart draws a range, and "cores" holds values');
  });
});
