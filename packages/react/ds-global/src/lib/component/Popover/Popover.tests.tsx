import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
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

  it("honors a controlled open state", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Popover trigger="Open" open={false} onOpenChange={onOpenChange}>
        Body
      </Popover>,
    );
    fireEvent.click(screen.getByText("Open"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("Open").closest("details")).not.toHaveAttribute(
      "open",
    );
    rerender(
      <Popover trigger="Open" open onOpenChange={onOpenChange}>
        Body
      </Popover>,
    );
    expect(screen.getByText("Open").closest("details")).toHaveAttribute("open");
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

  it("names its non-modal dialog from the trigger when no label is supplied", () => {
    renderPopover();
    fireEvent.click(screen.getByText("Open"));
    const dialog = screen.getByRole("dialog", { name: "Open" });
    expect(dialog).not.toHaveAttribute("aria-modal");
    expect(dialog).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("Open")).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("focuses the first enabled visible control and leaves its keys native", async () => {
    render(
      <Popover trigger="Filter" label="Filter instances">
        <input type="hidden" aria-label="Hidden" />
        <input disabled aria-label="Disabled" />
        <div style={{ display: "none" }}>
          <input aria-label="CSS-hidden" />
        </div>
        <button type="button" aria-disabled="true">
          Unavailable
        </button>
        <input aria-label="Search instances" />
        <label>
          <input type="checkbox" /> Running
        </label>
      </Popover>,
    );
    fireEvent.click(screen.getByText("Filter"));
    const search = screen.getByRole("textbox", { name: "Search instances" });
    await waitFor(() => expect(search).toHaveFocus());
    expect(
      screen.getByRole("dialog", { name: "Filter instances" }),
    ).toBeVisible();
    expect(fireEvent.keyDown(search, { key: "ArrowLeft" })).toBe(true);
    expect(fireEvent.keyDown(search, { key: "Tab" })).toBe(true);
  });

  it("focuses the dialog itself when it has no enabled controls", async () => {
    render(
      <Popover trigger="Open" label="Empty filter">
        <input disabled aria-label="Unavailable" />
      </Popover>,
    );
    fireEvent.click(screen.getByText("Open"));
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "Empty filter" }),
      ).toHaveFocus(),
    );
  });

  it("uses an explicit initial focus target and falls back if it is hidden", async () => {
    const requested = createRef<HTMLInputElement>();
    const { rerender } = render(
      <Popover trigger="Open" initialFocusRef={requested}>
        <input aria-label="First" />
        <input ref={requested} aria-label="Preferred" />
      </Popover>,
    );
    fireEvent.click(screen.getByText("Open"));
    await waitFor(() => expect(requested.current).toHaveFocus());
    fireEvent.keyDown(requested.current as HTMLInputElement, { key: "Escape" });

    rerender(
      <Popover trigger="Open" initialFocusRef={requested}>
        <input aria-label="First" />
        <div hidden>
          <input ref={requested} aria-label="Preferred" />
        </div>
      </Popover>,
    );
    fireEvent.click(screen.getByText("Open"));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "First" })).toHaveFocus(),
    );
  });

  it("returns focus on Escape but not on outside pointer dismissal", async () => {
    render(
      <>
        <Popover trigger="Filter" label="Filters">
          <input aria-label="Search" />
        </Popover>
        <button type="button">Outside</button>
      </>,
    );
    const trigger = screen.getByText("Filter");
    fireEvent.click(trigger);
    const input = screen.getByRole("textbox", { name: "Search" });
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.keyDown(input, { key: "Escape" });
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    await waitFor(() => expect(input).toHaveFocus());
    const outside = screen.getByRole("button", { name: "Outside" });
    outside.focus();
    fireEvent.pointerDown(outside);
    expect(outside).toHaveFocus();
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("supports a styled Button trigger without nesting a button in summary", async () => {
    render(
      <Popover
        trigger="Filter"
        triggerProps={{ importance: "secondary" }}
        label="Filters"
      >
        <input aria-label="Search" />
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Filter" });
    expect(trigger).toHaveClass("ds", "button", "secondary");
    expect(trigger.closest("summary")).toBeNull();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(trigger).toHaveAttribute("aria-controls", dialog.id);
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Search" })).toHaveFocus(),
    );
  });
});
