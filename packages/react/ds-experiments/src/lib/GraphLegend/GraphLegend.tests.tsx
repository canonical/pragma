import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GraphLegend from "./GraphLegend.js";

describe("GraphLegend", () => {
  it("names every entity and relation kind by default", () => {
    render(<GraphLegend />);

    for (const label of ["Component", "Token", "Standard", "Concept"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const verb of ["is a", "uses", "governs", "refines"]) {
      expect(screen.getByText(verb)).toBeInTheDocument();
    }
  });

  it("renders only the kinds it is given", () => {
    render(<GraphLegend entityKinds={["TOKEN"]} relationKinds={[]} />);

    expect(screen.getByText("Token")).toBeInTheDocument();
    expect(screen.queryByText("Component")).not.toBeInTheDocument();
    expect(screen.queryByText("uses")).not.toBeInTheDocument();
  });

  it("applies a custom className and forwards props", () => {
    render(<GraphLegend className="custom-class" data-testid="legend" />);

    const element = screen.getByTestId("legend");
    expect(element.className).toContain("ds graph-legend");
    expect(element.className).toContain("custom-class");
  });

  it("omits the heading when passed null", () => {
    render(<GraphLegend heading={null} />);

    expect(screen.queryByText("Legend")).not.toBeInTheDocument();
  });
});
