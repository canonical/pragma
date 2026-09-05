import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Separator from "./Separator.js";

describe("Separator", () => {
  it("renders an hr", () => {
    const { container } = render(<Separator />);
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("applies the base and custom class", () => {
    const { container } = render(<Separator className="custom-class" />);
    const el = container.querySelector("hr");
    expect(el?.className).toContain("ds side-navigation-separator");
    expect(el?.className).toContain("custom-class");
  });

  it("passes through native props", () => {
    const { container } = render(<Separator data-testid="rule" />);
    expect(container.querySelector("[data-testid='rule']")).toBeInTheDocument();
  });
});
