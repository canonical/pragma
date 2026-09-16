import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createFacetedFleet } from "../../../../../../testing/createFacetedProviders.js";
import silenceRenderErrors from "../../../../../../testing/silenceRenderErrors.js";
import DataViews from "../../Provider.js";
import FacetRangeChart from "./FacetRangeChart.js";

describe("DataViews FacetRangeChart", () => {
  it("draws the enclosing root's facets", () => {
    render(
      <DataViews provider={createFacetedFleet()}>
        <FacetRangeChart field="cores" label="Cores" />
      </DataViews>,
    );
    expect(screen.getByRole("figure", { name: "Cores" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("throws outside a DataViews root, naming the part", () => {
    silenceRenderErrors();
    expect(() =>
      render(<FacetRangeChart field="cores" label="Cores" />),
    ).toThrow("DataViews.FacetRangeChart must be used inside a DataViews root");
  });
});
