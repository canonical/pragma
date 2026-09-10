import { fireEvent, render, screen } from "@testing-library/react";
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

  it("wires a tooltip naming the action for each state (the 24.04 spec §5, §9.4)", () => {
    const { rerender } = render(<CollapseToggle expanded />);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(
      "Collapse",
    );

    rerender(<CollapseToggle expanded={false} />);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(
      "Expand",
    );
  });

  it("keeps the same button mounted across state changes, retaining focus", () => {
    // The tooltip's message follows the expanded state, so an earlier pass
    // picked between two withTooltip-wrapped component types — remounting
    // the button on every toggle and dropping keyboard focus to <body>.
    // TooltipEngine keeps one stable element; this pins that contract.
    const onToggle = vi.fn();
    const { rerender } = render(
      <CollapseToggle expanded onToggle={onToggle} />,
    );
    const button = screen.getByRole("button");
    button.focus();
    expect(document.activeElement).toBe(button);

    fireEvent.click(button);
    rerender(<CollapseToggle expanded={false} onToggle={onToggle} />);

    const buttonAfter = screen.getByRole("button");
    expect(buttonAfter).toBe(button);
    expect(document.activeElement).toBe(buttonAfter);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(
      "Expand",
    );
  });
});
