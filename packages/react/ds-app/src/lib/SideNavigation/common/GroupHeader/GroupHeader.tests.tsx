import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GroupHeader from "./GroupHeader.js";

describe("GroupHeader", () => {
  it("renders its children", () => {
    render(<GroupHeader>Hardware</GroupHeader>);
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("applies the base and custom class", () => {
    render(<GroupHeader className="custom-class">Hardware</GroupHeader>);
    const el = screen.getByText("Hardware");
    expect(el.className).toContain("ds side-navigation-group-header");
    expect(el.className).toContain("custom-class");
  });

  it("passes through native props", () => {
    render(<GroupHeader data-testid="header">Hardware</GroupHeader>);
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });
});
