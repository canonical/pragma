import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import type { WithTooltipOptions } from "./index.js";
import { withTooltip } from "./index.js";

vi.mock("react-dom", () => ({
  createPortal: vi.fn((children) => children),
}));

describe("withTooltip", () => {
  const Message = "Tooltip Message";
  const Trigger = () => <span>Target Element</span>;

  /** Wrap the trigger with a tooltip and render it. */
  const renderTooltip = (options?: WithTooltipOptions) => {
    const Tooltipped = withTooltip(Trigger, Message, options);
    return render(<Tooltipped />);
  };

  it("renders children", () => {
    renderTooltip();
    expect(screen.getByText("Target Element")).toBeInTheDocument();
  });

  it("renders tooltip message on hover", async () => {
    renderTooltip();
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    expect(await screen.findByText(Message)).toBeInTheDocument();
  });

  it("renders tooltip message on focus", async () => {
    renderTooltip();
    const target = screen.getByText("Target Element");
    fireEvent.focus(target);
    expect(await screen.findByText(Message)).toBeInTheDocument();
  });

  it("hides tooltip message on blur", async () => {
    renderTooltip();
    const target = screen.getByText("Target Element");
    fireEvent.focus(target);
    await screen.findByText(Message);
    fireEvent.blur(target);
    await waitFor(() => expect(screen.queryByText(Message)).not.toBeVisible());
  });

  it("hides tooltip message on pointer leave", async () => {
    renderTooltip();
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    await screen.findByText(Message);
    fireEvent.pointerLeave(target);
    await waitFor(() => expect(screen.queryByText(Message)).not.toBeVisible());
  });

  it("applies messageElementClassName", async () => {
    const messageElementClassName = "test-message-class";
    renderTooltip({ messageElementClassName });
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    // The message text lives in an inner `.text` span; the class is on the
    // tooltip root, so climb from the text to the root element.
    const message = await screen.findByText(Message);
    expect(message.closest(".ds.tooltip")).toHaveClass(messageElementClassName);
  });

  it("does not couple the arrow size to the distance prop", async () => {
    // Arrow size is an independent token; `distance` only drives the gap
    // between the trigger and the popup, not the arrow geometry.
    renderTooltip({ distance: "10px" });
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    const message = await screen.findByText(Message);
    expect(message.style.getPropertyValue("--tooltip-spacing-arrow-size")).toBe(
      "",
    );
  });

  it("renders the tooltip on the contrasted surface", async () => {
    renderTooltip();
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    const message = await screen.findByText(Message);
    expect(message.closest(".ds.tooltip")).toHaveClass("contrasted");
  });

  it("uses createPortal to render tooltip", async () => {
    renderTooltip();
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    await screen.findByText(Message);
    expect(createPortal).toHaveBeenCalled();
  });

  it("renders tooltip with default parentElement document.body if parentElement not provided", async () => {
    renderTooltip();
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    await screen.findByText(Message);
    expect(createPortal).toHaveBeenCalledWith(expect.anything(), document.body);
  });

  it("sets the wrapped component's displayName", () => {
    const Tooltipped = withTooltip(Trigger, Message);
    expect(Tooltipped.displayName).toBe("withTooltip(Trigger)");
  });
});
