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

  it("sets title as a native tooltip fallback for truncation when children is text (SPEC.md §10.17)", () => {
    render(<GroupHeader>Hardware</GroupHeader>);
    expect(screen.getByText("Hardware")).toHaveAttribute("title", "Hardware");
  });

  it("lets a consumer-supplied title override the default", () => {
    render(<GroupHeader title="Custom tooltip">Hardware</GroupHeader>);
    expect(screen.getByText("Hardware")).toHaveAttribute(
      "title",
      "Custom tooltip",
    );
  });
});
