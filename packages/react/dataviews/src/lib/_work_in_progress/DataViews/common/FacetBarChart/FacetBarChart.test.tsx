import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createFacetedFleet } from "../../../../../../testing/createFacetedProviders.js";
import silenceRenderErrors from "../../../../../../testing/silenceRenderErrors.js";
import DataViews from "../../Provider.js";
import FacetBarChart from "./FacetBarChart.js";

describe("DataViews FacetBarChart", () => {
  it("draws the enclosing root's facets", () => {
    render(
      <DataViews provider={createFacetedFleet()}>
        <FacetBarChart field="status" label="Machines by status" />
      </DataViews>,
    );
    expect(
      screen.getByRole("figure", { name: "Machines by status" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("throws outside a DataViews root, naming the part", () => {
    silenceRenderErrors();
    expect(() =>
      render(<FacetBarChart field="status" label="Machines by status" />),
    ).toThrow("DataViews.FacetBarChart must be used inside a DataViews root");
  });
});
