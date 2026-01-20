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
  it("renders heading and content", () => {
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

  it("hides content when not expanded", () => {
    render(
      <Accordion>
        <Accordion.Item heading="Test Heading">Test Content</Accordion.Item>
      </Accordion>,
    );

    const content = screen.getByRole("region", { hidden: true });
    expect(content).toHaveAttribute("hidden");
  });

  it("shows content when expanded", () => {
    render(
      <Accordion>
        <Accordion.Item heading="Test Heading" expanded>
          Test Content
        </Accordion.Item>
      </Accordion>,
    );

    const content = screen.getByRole("region");
    expect(content).not.toHaveAttribute("hidden");
  });

  it("calls onExpandedChange when header is clicked", () => {
    const onExpandedChange = vi.fn();

    render(
      <Accordion>
        <Accordion.Item heading="Test Heading" onExpandedChange={onExpandedChange}>
          Test Content
        </Accordion.Item>
      </Accordion>,
    );

    fireEvent.click(screen.getByRole("button", { name: /test heading/i }));

    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  it("toggles expanded state on click", () => {
    const onExpandedChange = vi.fn();

    render(
      <Accordion>
        <Accordion.Item
          heading="Test Heading"
          expanded
          onExpandedChange={onExpandedChange}
        >
          Test Content
        </Accordion.Item>
      </Accordion>,
    );

    fireEvent.click(screen.getByRole("button", { name: /test heading/i }));

    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("has correct aria attributes", () => {
    render(
      <Accordion>
        <Accordion.Item heading="Test Heading" expanded>
          Test Content
        </Accordion.Item>
      </Accordion>,
    );

    const button = screen.getByRole("button", { name: /test heading/i });
    const region = screen.getByRole("region");

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-controls", region.id);
    expect(region).toHaveAttribute("aria-labelledby", button.id);
  });

  it("supports keyboard navigation with Enter key", () => {
    const onExpandedChange = vi.fn();

    render(
      <Accordion>
        <Accordion.Item heading="Test Heading" onExpandedChange={onExpandedChange}>
          Test Content
        </Accordion.Item>
      </Accordion>,
    );

    const button = screen.getByRole("button", { name: /test heading/i });
    fireEvent.keyDown(button, { key: "Enter" });

    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  it("supports keyboard navigation with Space key", () => {
    const onExpandedChange = vi.fn();

    render(
      <Accordion>
        <Accordion.Item heading="Test Heading" onExpandedChange={onExpandedChange}>
          Test Content
        </Accordion.Item>
      </Accordion>,
    );

    const button = screen.getByRole("button", { name: /test heading/i });
    fireEvent.keyDown(button, { key: " " });

    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});
