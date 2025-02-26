/* @canonical/generator-ds 0.9.0-experimental.4 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ViewModeTabs from "./ViewModeTabs.js";

describe("ViewModeTabs", () => {
  const mockOnEditModeChange = vi.fn();

  beforeEach(() => {
    mockOnEditModeChange.mockClear();
  });

  it("renders correctly with default props", () => {
    render(
      <ViewModeTabs editMode="write" onEditModeChange={mockOnEditModeChange} />,
    );

    // Should render both tabs
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent("Write");
    expect(tabs[1]).toHaveTextContent("Preview");

    // Write tab should be selected
    expect(tabs[0]).toHaveClass("selected");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).not.toHaveClass("selected");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("renders with custom className and style", () => {
    render(
      <ViewModeTabs
        editMode="write"
        onEditModeChange={mockOnEditModeChange}
        className="custom-class"
        style={{ width: "300px" }}
      />,
    );

    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveClass("ds");
    expect(tablist).toHaveClass("view-mode-tabs");
    expect(tablist).toHaveClass("custom-class");
    expect(tablist).toHaveStyle({ width: "300px" });
  });

  it("changes tab when clicked", async () => {
    render(
      <ViewModeTabs editMode="write" onEditModeChange={mockOnEditModeChange} />,
    );

    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]); // Click on Preview tab

    await waitFor(() => {
      expect(mockOnEditModeChange).toHaveBeenCalledWith("preview");
    });
  });

  it("handles keyboard navigation with arrow keys", async () => {
    const { rerender } = render(
      <ViewModeTabs editMode="write" onEditModeChange={mockOnEditModeChange} />,
    );

    const tabs = screen.getAllByRole("tab");

    // Navigate from Write to Preview with right arrow
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });

    await waitFor(() => {
      expect(mockOnEditModeChange).toHaveBeenCalledWith("preview");
    });

    // Clear mock
    mockOnEditModeChange.mockClear();

    // Update component with new editMode
    rerender(
      <ViewModeTabs
        editMode="preview"
        onEditModeChange={mockOnEditModeChange}
      />,
    );

    // Navigate from Preview to Write with left arrow
    fireEvent.keyDown(screen.getAllByRole("tab")[1], { key: "ArrowLeft" });

    await waitFor(() => {
      expect(mockOnEditModeChange).toHaveBeenCalledWith("write");
    });
  });

  it("selects tab with Enter key", async () => {
    render(
      <ViewModeTabs editMode="write" onEditModeChange={mockOnEditModeChange} />,
    );

    const tabs = screen.getAllByRole("tab");
    fireEvent.keyDown(tabs[1], { key: "Enter" });

    await waitFor(() => {
      expect(mockOnEditModeChange).toHaveBeenCalledWith("preview");
    });
  });

  it("selects tab with Space key", async () => {
    render(
      <ViewModeTabs editMode="write" onEditModeChange={mockOnEditModeChange} />,
    );

    const tabs = screen.getAllByRole("tab");
    fireEvent.keyDown(tabs[1], { key: " " });

    await waitFor(() => {
      expect(mockOnEditModeChange).toHaveBeenCalledWith("preview");
    });
  });

  it("sets correct tabIndex values", () => {
    const { rerender } = render(
      <ViewModeTabs editMode="write" onEditModeChange={mockOnEditModeChange} />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("tabIndex", "0");
    expect(tabs[1]).toHaveAttribute("tabIndex", "-1");

    // Re-render with different editMode
    rerender(
      <ViewModeTabs
        editMode="preview"
        onEditModeChange={mockOnEditModeChange}
      />,
    );

    const updatedTabs = screen.getAllByRole("tab");
    expect(updatedTabs[0]).toHaveAttribute("tabIndex", "-1");
    expect(updatedTabs[1]).toHaveAttribute("tabIndex", "0");
  });
});
