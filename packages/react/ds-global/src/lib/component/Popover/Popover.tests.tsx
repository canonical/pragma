import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Popover from "./Popover.js";

const renderPopover = (props = {}) =>
  render(
    <Popover trigger="Open" {...props}>
      Popover body
    </Popover>,
  );

describe("Popover", () => {
  it("renders a native details/summary with the trigger", () => {
    renderPopover();
    const summary = screen.getByText("Open");
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.closest("details")).toHaveClass("ds", "popover");
    expect(screen.getByText("Popover body")).toBeInTheDocument();
  });

  it("is closed by default", () => {
    renderPopover();
    const details = screen.getByText("Open").closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("opens when the trigger is clicked", () => {
    renderPopover();
    const summary = screen.getByText("Open");
    fireEvent.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-hidden", "false");
  });

  it("reports open-state changes via onOpenChange", () => {
    const onOpenChange = vi.fn();
    renderPopover({ onOpenChange });
    fireEvent.click(screen.getByText("Open"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("closes on Escape", () => {
    renderPopover();
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-hidden", "false");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("closes on an outside pointer-down", () => {
    renderPopover();
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-hidden", "false");

    fireEvent.pointerDown(document.body);
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("wires aria-controls between trigger and content and reflects open via details", () => {
    renderPopover();
    const summary = screen.getByText("Open");
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(summary).toHaveAttribute("aria-controls", dialog.id);
    // The native <details open> conveys the expanded state (aria-expanded on a
    // <summary> is invalid), so assert the details element opens.
    fireEvent.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
  });
});
