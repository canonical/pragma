import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ItemExpandable from "./ItemExpandable.js";

describe("ItemExpandable", () => {
  it("renders the label and, when expanded, its children", () => {
    render(
      <ItemExpandable label="Hardware" defaultExpanded>
        <li>Machines</li>
      </ItemExpandable>,
    );
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Machines")).toBeInTheDocument();
  });

  it("starts closed by default", () => {
    const { container } = render(
      <ItemExpandable label="Hardware">
        <li>Machines</li>
      </ItemExpandable>,
    );
    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });

  it("starts open when defaultExpanded is set", () => {
    const { container } = render(
      <ItemExpandable label="Hardware" defaultExpanded>
        <li>Machines</li>
      </ItemExpandable>,
    );
    expect(container.querySelector("details")).toHaveAttribute("open");
  });

  it("toggles open/closed when the summary is activated", () => {
    const { container } = render(
      <ItemExpandable label="Hardware">
        <li>Machines</li>
      </ItemExpandable>,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = container.querySelector("summary") as HTMLElement;

    expect(details).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).not.toHaveAttribute("open");
  });

  it("ignores toggling when disabled", () => {
    const { container } = render(
      <ItemExpandable label="Hardware" disabled>
        <li>Machines</li>
      </ItemExpandable>,
    );
    const li = container.firstElementChild;
    expect(li).toHaveAttribute("data-disabled");

    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = container.querySelector("summary") as HTMLElement;
    fireEvent.click(summary);
    expect(details).not.toHaveAttribute("open");
  });

  it("applies custom className", () => {
    const { container } = render(
      <ItemExpandable label="Hardware" className="custom-class" />,
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("ds side-navigation-item-expandable");
    expect(el?.className).toContain("custom-class");
  });
});
