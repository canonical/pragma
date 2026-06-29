import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { RangeField } from "./index.js";

describe("RangeField", () => {
  it("renders a range input", () => {
    renderWithForm(<RangeField name="volume" min={0} max={100} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("registers with react-hook-form", () => {
    renderWithForm(<RangeField name="volume" min={0} max={100} />);
    expect(screen.getByRole("slider")).toHaveAttribute("name", "volume");
  });

  it("renders an output element", () => {
    renderWithForm(<RangeField name="volume" min={0} max={100} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("respects min and max", () => {
    renderWithForm(<RangeField name="volume" min={0} max={100} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
  });
});
