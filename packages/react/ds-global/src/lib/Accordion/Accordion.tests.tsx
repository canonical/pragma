import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Accordion from "./Accordion.js";

describe("Accordion", () => {
  it("renders with children", () => {
    render(
      <Accordion>
        <Accordion.Item heading="Test Heading">Test Content</Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByText("Test Heading")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <Accordion className="custom-class">
        <Accordion.Item heading="Test">Content</Accordion.Item>
      </Accordion>,
    );
    expect(container.firstChild).toHaveClass("ds", "accordion", "custom-class");
  });

  it("passes through additional props", () => {
    render(
      <Accordion data-testid="test-accordion">
        <Accordion.Item heading="Test">Content</Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByTestId("test-accordion")).toBeInTheDocument();
  });
});

describe("Accordion.Item", () => {
  it("renders heading and content when expanded", () => {
    render(
      <Accordion>
        <Accordion.Item heading="Test Heading" expanded>
          Test Content
        </Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByText("Test Heading")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("hides content when collapsed, shows when expanded", () => {
    const { rerender } = render(
      <Accordion>
        <Accordion.Item heading="Test">Content</Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByRole("region", { hidden: true })).toHaveAttribute(
      "hidden",
    );

    rerender(
      <Accordion>
        <Accordion.Item heading="Test" expanded>
          Content
        </Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByRole("region")).not.toHaveAttribute("hidden");
  });

  it("calls onExpandedChange on click, toggling state", () => {
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <Accordion>
        <Accordion.Item heading="Test" onExpandedChange={onExpandedChange}>
          Content
        </Accordion.Item>
      </Accordion>,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onExpandedChange).toHaveBeenCalledWith(true);

    rerender(
      <Accordion>
        <Accordion.Item
          heading="Test"
          expanded
          onExpandedChange={onExpandedChange}
        >
          Content
        </Accordion.Item>
      </Accordion>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("has correct aria attributes", () => {
    render(
      <Accordion>
        <Accordion.Item heading="Test" expanded>
          Content
        </Accordion.Item>
      </Accordion>,
    );

    const button = screen.getByRole("button");
    const region = screen.getByRole("region");

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-controls", region.id);
    expect(region).toHaveAttribute("aria-labelledby", button.id);
  });

  it("toggles on Enter and Space keys", () => {
    const onExpandedChange = vi.fn();
    render(
      <Accordion>
        <Accordion.Item heading="Test" onExpandedChange={onExpandedChange}>
          Content
        </Accordion.Item>
      </Accordion>,
    );

    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onExpandedChange).toHaveBeenCalledWith(true);

    onExpandedChange.mockClear();
    fireEvent.keyDown(button, { key: " " });
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});

describe("Accordion keyboard navigation", () => {
  const renderThreeItems = () =>
    render(
      <Accordion>
        <Accordion.Item heading="First">First Content</Accordion.Item>
        <Accordion.Item heading="Second">Second Content</Accordion.Item>
        <Accordion.Item heading="Third">Third Content</Accordion.Item>
      </Accordion>,
    );

  it("ArrowDown moves focus to next item, wrapping at end", () => {
    renderThreeItems();
    const buttons = screen.getAllByRole("button");

    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(buttons[1]);

    buttons[2].focus();
    fireEvent.keyDown(buttons[2], { key: "ArrowDown" });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("ArrowUp moves focus to previous item, wrapping at start", () => {
    renderThreeItems();
    const buttons = screen.getAllByRole("button");

    buttons[1].focus();
    fireEvent.keyDown(buttons[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(buttons[0]);

    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(buttons[2]);
  });

  it("Home moves focus to first item, End to last", () => {
    renderThreeItems();
    const buttons = screen.getAllByRole("button");

    buttons[2].focus();
    fireEvent.keyDown(buttons[2], { key: "Home" });
    expect(document.activeElement).toBe(buttons[0]);

    fireEvent.keyDown(buttons[0], { key: "End" });
    expect(document.activeElement).toBe(buttons[2]);
  });
});
