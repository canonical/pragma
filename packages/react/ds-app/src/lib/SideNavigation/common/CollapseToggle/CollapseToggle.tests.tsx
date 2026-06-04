import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CollapseToggle from "./CollapseToggle.js";

describe("CollapseToggle", () => {
  it("renders a button", () => {
    render(<CollapseToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("reflects the expanded state via aria-expanded and label", () => {
    const { rerender } = render(<CollapseToggle expanded />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: "Collapse navigation" }),
    ).toBeInTheDocument();

    rerender(<CollapseToggle expanded={false} />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Expand navigation" }),
    ).toBeInTheDocument();
  });

  it("calls onClick when activated", () => {
    const onClick = vi.fn();
    render(<CollapseToggle onClick={onClick} />);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies custom className and passes through props", () => {
    render(<CollapseToggle className="custom-class" data-testid="toggle" />);
    const element = screen.getByTestId("toggle");
    expect(element.className).toContain("ds collapse-toggle");
    expect(element.className).toContain("custom-class");
  });
});
