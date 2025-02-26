/* @canonical/generator-ds 0.9.0-experimental.4 */
import { fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps } from "react";
import { Tooltip as T } from "react-tooltip";
import { describe, expect, it, vi } from "vitest";
import ToolbarButton from "./ToolbarButton.js";

// Mock the react-tooltip module
vi.mock("react-tooltip", () => ({
  Tooltip: ({ id, style }: ComponentProps<typeof T>) => (
    <div data-testid={`tooltip-${id}`} style={style} />
  ),
}));

describe("ToolbarButton", () => {
  it("renders correctly with basic props", () => {
    render(
      <ToolbarButton label="Bold">
        <svg data-testid="icon" />
      </ToolbarButton>
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Bold");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("applies custom className and style", () => {
    render(
      <ToolbarButton
        label="Italic"
        className="custom-class"
        style={{ width: "50px" }}
      >
        <span>I</span>
      </ToolbarButton>
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass("ds");
    expect(button).toHaveClass("toolbar-button");
    expect(button).toHaveClass("custom-class");
    expect(button).toHaveStyle({ width: "50px" });
  });

  it("sets up tooltip with label only", () => {
    render(<ToolbarButton label="Bold" />);

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
    render(<ToolbarButton label="Bold" shortcut="Ctrl+B" />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-tooltip-content", "Bold (Ctrl+B)");
  });

  it("passes extra props to the button", () => {
    render(
      <ToolbarButton label="Bold" disabled={true} data-test="test-value" />
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-test", "test-value");
  });

  it("handles left arrow key navigation", () => {
    // Create a toolbar structure with multiple buttons
    const { container } = render(
      <div role="toolbar">
        <ToolbarButton label="Button 1" />
        <ToolbarButton label="Button 2" data-testid="middle-button" />
        <ToolbarButton label="Button 3" />
      </div>
    );

    // Focus the middle button
    const middleButton = screen.getByTestId("middle-button");
    middleButton.focus();

    // Press ArrowLeft
    fireEvent.keyDown(middleButton, { key: "ArrowLeft" });

    // Check if previous button got focus (need to get buttons from container)
    const buttons = container.querySelectorAll("button");
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("handles right arrow key navigation", () => {
    // Create a toolbar structure with multiple buttons
    const { container } = render(
      <div role="toolbar">
        <ToolbarButton label="Button 1" />
        <ToolbarButton label="Button 2" data-testid="middle-button" />
        <ToolbarButton label="Button 3" />
      </div>
    );

    // Focus the middle button
    const middleButton = screen.getByTestId("middle-button");
    middleButton.focus();

    // Press ArrowRight
    fireEvent.keyDown(middleButton, { key: "ArrowRight" });

    // Check if next button got focus
    const buttons = container.querySelectorAll("button");
    expect(document.activeElement).toBe(buttons[2]);
  });

  it("does nothing when arrow keys are pressed but no siblings exist", () => {
    // Render a single button (no toolbar)
    render(<ToolbarButton label="Lonely Button" data-testid="lonely-button" />);

    const button = screen.getByTestId("lonely-button");
    button.focus();

    // Press arrow keys
    fireEvent.keyDown(button, { key: "ArrowLeft" });
    fireEvent.keyDown(button, { key: "ArrowRight" });

    // Button should still have focus
    expect(document.activeElement).toBe(button);
  });
});
