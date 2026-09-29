import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Footer from "./Footer.js";

describe("SidePanel.Footer", () => {
  it("renders children", () => {
    render(<Footer>Actions</Footer>);
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("applies the base and custom class", () => {
    render(<Footer className="custom-class">Actions</Footer>);
    const element = screen.getByText("Actions");
    expect(element.className).toContain("ds side-panel-footer");
    expect(element.className).toContain("custom-class");
  });

  it("passes through additional props", () => {
    render(<Footer data-testid="test-component">Actions</Footer>);
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });
});
