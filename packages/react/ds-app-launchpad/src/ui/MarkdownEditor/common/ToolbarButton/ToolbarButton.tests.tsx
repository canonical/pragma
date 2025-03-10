/* @canonical/generator-ds 0.9.0-experimental.4 */
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { Tooltip as T } from "react-tooltip";
import { describe, expect, it, vi } from "vitest";
import Component from "./ToolbarButton.js";

// Mock the react-tooltip module
vi.mock("react-tooltip", () => ({
  Tooltip: ({ id, style }: ComponentProps<typeof T>) => (
    <div data-testid={`tooltip-${id}`} style={style} />
  ),
}));

describe("ToolbarButton", () => {
  it("renders correctly with basic props", () => {
    render(
      <Component label="Bold">
        <svg data-testid="icon" />
      </Component>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Bold");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("applies custom className and style", () => {
    render(
      <Component
        label="Italic"
        className="custom-class"
        style={{ width: "50px" }}
      >
        <span>I</span>
      </Component>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass("ds");
    expect(button).toHaveClass("toolbar-button");
    expect(button).toHaveClass("custom-class");
    expect(button).toHaveStyle({ width: "50px" });
  });

  it("sets up tooltip with label only", () => {
    render(<Component label="Bold" />);

    const button = screen.getByRole("button");
    const tooltipId = button.getAttribute("data-tooltip-id");

    expect(button).toHaveAttribute("data-tooltip-content", "Bold");
    expect(button).toHaveAttribute("data-tooltip-place", "bottom");
    expect(tooltipId).toBeTruthy();

    // Check if tooltip component exists with the same ID
    const tooltipTestId = `tooltip-${tooltipId}`;
    expect(screen.getByTestId(tooltipTestId)).toBeInTheDocument();
  });

  it("sets up tooltip with label and shortcut", () => {
    render(<Component label="Bold" shortcut="Ctrl+B" />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-tooltip-content", "Bold (Ctrl+B)");
  });

  it("passes extra props to the button", () => {
    render(<Component label="Bold" disabled={true} data-test="test-value" />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-test", "test-value");
  });

  // Removed keyboard navigation tests
});
