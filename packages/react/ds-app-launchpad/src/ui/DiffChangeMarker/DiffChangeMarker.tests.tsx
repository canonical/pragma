/* @canonical/generator-ds 0.9.0-experimental.12 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./DiffChangeMarker.js";

describe("DiffChangeMarker component", () => {
  // Auto mode tests
  it("renders additions in auto mode", () => {
    const { container } = render(
      <Component additions={3} deletions={0} markerStyle="simple" />,
    );
    const element = container.firstChild;
    expect(element).toHaveClass("diff-change-marker");
    expect(element).toHaveClass("style-simple");
  });

  it("renders deletions in auto mode", () => {
    const { container } = render(
      <Component deletions={2} additions={0} markerStyle="detailed" />,
    );
    const element = container.firstChild;
    expect(element).toHaveClass("diff-change-marker");
  });

  it("renders modifications in auto mode", () => {
    const { container } = render(
      <Component additions={1} deletions={1} markerStyle="detailed" />,
    );
    const element = container.firstChild;
    expect(element).toHaveClass("diff-change-marker");
  });

  // Manual mode tests
  it("renders added type in manual mode", () => {
    const { container } = render(
      <Component type="added" markerStyle="detailed" />,
    );
    const element = container.firstChild;
    expect(element).toHaveClass("diff-change-marker");
  });

  it("renders deleted type in manual mode", () => {
    const { container } = render(
      <Component type="deleted" markerStyle="detailed" />,
    );
    const element = container.firstChild;
    expect(element).toHaveClass("diff-change-marker");
  });

  it("renders modified type in manual mode", () => {
    const { container } = render(
      <Component type="modified" markerStyle="detailed" />,
    );
    const element = container.firstChild;
    expect(element).toHaveClass("diff-change-marker");
  });

  // Display style tests
  it("renders in detailed style", () => {
    const { container } = render(
      <Component markerStyle="detailed" additions={5} deletions={2} />,
    );
    const element = container.firstChild;
    expect(element).toHaveClass("style-detailed");
    expect(screen.getByText("+5")).toBeInTheDocument();
    expect(screen.getByText("-2")).toBeInTheDocument();
  });

  it("renders in simple style", () => {
    const { container } = render(
      <Component markerStyle="simple" type="added" />,
    );
    const element = container.firstChild;
    expect(element).toHaveClass("style-simple");
  });

  // Props tests
  it("applies className", () => {
    const { container } = render(
      <Component
        className="test-class"
        additions={1}
        deletions={0}
        markerStyle="simple"
      />,
    );
    const element = container.firstChild;
    expect(element).toHaveClass("test-class");
  });

  it("applies id", () => {
    const { container } = render(
      <Component
        id="test-id"
        additions={1}
        deletions={0}
        markerStyle="simple"
      />,
    );
    expect(container.firstChild).toHaveAttribute("id", "test-id");
  });
});
