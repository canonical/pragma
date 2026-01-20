import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import Tooltip from "./TooltipArea.js";

vi.mock("react-dom", () => ({
  createPortal: vi.fn((children) => children),
}));

describe("TooltipArea component", () => {
  const Message = "Tooltip Message";
  const Children = <span>Target Element</span>;

  it("renders children", () => {
    render(<Tooltip Message={Message}>{Children}</Tooltip>);
    expect(screen.getByText("Target Element")).toBeInTheDocument();
  });

  it("renders tooltip message on hover", async () => {
    render(<Tooltip Message={Message}>{Children}</Tooltip>);
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    expect(await screen.findByText(Message)).toBeInTheDocument();
  });

  it("renders tooltip message on focus", async () => {
    render(<Tooltip Message={Message}>{Children}</Tooltip>);
    const target = screen.getByText("Target Element");
    fireEvent.focus(target);
    expect(await screen.findByText(Message)).toBeInTheDocument();
  });

  it("hides tooltip message on blur", async () => {
    render(<Tooltip Message={Message}>{Children}</Tooltip>);
    const target = screen.getByText("Target Element");
    fireEvent.focus(target);
    await screen.findByText(Message);
    fireEvent.blur(target);
    await waitFor(() => expect(screen.queryByText(Message)).not.toBeVisible());
  });

  it("hides tooltip message on pointer leave", async () => {
    render(<Tooltip Message={Message}>{Children}</Tooltip>);
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    await screen.findByText(Message);
    fireEvent.pointerLeave(target);
    await waitFor(() => expect(screen.queryByText(Message)).not.toBeVisible());
  });

  it("applies messageElementClassName", async () => {
    const messageElementClassName = "test-message-class";
    render(
      <Tooltip
        Message={Message}
        messageElementClassName={messageElementClassName}
      >
        {Children}
      </Tooltip>,
    );
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    expect(await screen.findByText(Message)).toHaveClass(
      messageElementClassName,
    );
  });

  it("applies distance prop to tooltip style", async () => {
    const distance = "10px";
    render(
      <Tooltip Message={Message} distance={distance}>
        {Children}
      </Tooltip>,
    );
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    expect(await screen.findByText(Message)).toHaveStyle({
      "--tooltip-spacing-arrow-size": distance,
    });
  });

  it("uses createPortal to render tooltip", async () => {
    render(<Tooltip Message={Message}>{Children}</Tooltip>);
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    await screen.findByText(Message);
    expect(createPortal).toHaveBeenCalled();
  });

  it("renders tooltip with default parentElement document.body if parentElement not provided", async () => {
    render(<Tooltip Message={Message}>{Children}</Tooltip>);
    const target = screen.getByText("Target Element");
    fireEvent.pointerEnter(target);
    await screen.findByText(Message);
    expect(createPortal).toHaveBeenCalledWith(expect.anything(), document.body);
  });
});
