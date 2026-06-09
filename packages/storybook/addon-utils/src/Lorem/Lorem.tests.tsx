import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Lorem from "./Lorem.js";

describe("Lorem", () => {
  it("renders the requested number of paragraphs", () => {
    const { container } = render(<Lorem paragraphs={5} />);
    expect(container.querySelectorAll("p")).toHaveLength(5);
  });

  it("defaults to 3 paragraphs", () => {
    const { container } = render(<Lorem />);
    expect(container.querySelectorAll("p")).toHaveLength(3);
  });

  it("applies the base and custom class to the root", () => {
    const { container } = render(<Lorem className="custom-class" />);
    const root = container.firstElementChild;
    expect(root?.className).toContain("ds lorem");
    expect(root?.className).toContain("custom-class");
  });

  it("passes through additional props", () => {
    const { container } = render(<Lorem data-testid="filler" />);
    expect(container.querySelector('[data-testid="filler"]')).not.toBeNull();
  });
});
