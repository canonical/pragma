import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Cards from "./Cards.js";

describe("Cards", () => {
  it("renders as a ds cards subgrid with its children", () => {
    const { container } = render(<Cards>content</Cards>);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("ds", "cards", "subgrid");
    expect(root).toHaveTextContent("content");
  });

  it("applies custom className alongside the base classes", () => {
    const { container } = render(<Cards className="custom">content</Cards>);
    expect(container.firstElementChild).toHaveClass("ds", "cards", "custom");
  });

  it("sets --card-span from cardSpan (default 1)", () => {
    const { container, rerender } = render(<Cards>c</Cards>);
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue(
        "--card-span",
      ),
    ).toBe("1");

    rerender(<Cards cardSpan={6}>c</Cards>);
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue(
        "--card-span",
      ),
    ).toBe("6");
  });

  it("clamps cardSpan to a positive integer", () => {
    const { container, rerender } = render(<Cards cardSpan={0}>c</Cards>);
    const el = () => container.firstElementChild as HTMLElement;
    expect(el().style.getPropertyValue("--card-span")).toBe("1");

    rerender(<Cards cardSpan={-3}>c</Cards>);
    expect(el().style.getPropertyValue("--card-span")).toBe("1");

    rerender(<Cards cardSpan={2.7}>c</Cards>);
    expect(el().style.getPropertyValue("--card-span")).toBe("2");
  });

  it("passes through additional props", () => {
    const { getByTestId } = render(<Cards data-testid="cards">c</Cards>);
    expect(getByTestId("cards")).toBeInTheDocument();
  });
});
