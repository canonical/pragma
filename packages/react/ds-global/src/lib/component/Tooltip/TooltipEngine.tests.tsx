import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TooltipEngine } from "./index.js";

describe("TooltipEngine", () => {
  const Target = ({ state }: { state: string }) => (
    <button type="button">{`Target (${state})`}</button>
  );

  it("renders the message as a live prop — reactive to rerender", async () => {
    const { rerender } = render(
      <TooltipEngine Message="Collapse">
        <Target state="expanded" />
      </TooltipEngine>,
    );
    fireEvent.pointerEnter(screen.getByRole("button"));
    expect(await screen.findByText("Collapse")).toBeInTheDocument();

    rerender(
      <TooltipEngine Message="Expand">
        <Target state="collapsed" />
      </TooltipEngine>,
    );
    fireEvent.pointerEnter(screen.getByRole("button"));
    expect(await screen.findByText("Expand")).toBeInTheDocument();
  });

  it("keeps the same target element identity across rerenders", () => {
    const { rerender } = render(
      <TooltipEngine Message="Collapse">
        <Target state="expanded" />
      </TooltipEngine>,
    );
    const targetBefore = document.querySelector(
      ".ds.tooltip-area > .target",
    ) as HTMLElement;
    rerender(
      <TooltipEngine Message="Expand">
        <Target state="collapsed" />
      </TooltipEngine>,
    );
    const targetAfter = document.querySelector(
      ".ds.tooltip-area > .target",
    ) as HTMLElement;
    // One stable element across prop changes — switching between two
    // withTooltip-wrapped types would remount the target.
    expect(targetAfter).toBe(targetBefore);
  });
});
