import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExpansionIndicator from "./ExpansionIndicator.js";

describe("Timeline.ExpansionIndicator", () => {
  it("renders the hidden summary", () => {
    render(<ExpansionIndicator hiddenCount={42} />);
    expect(screen.getByText("42 hidden")).toBeInTheDocument();
  });

  it("renders show more with the step count", () => {
    const onShowMore = vi.fn();
    render(<ExpansionIndicator step={20} onShowMore={onShowMore} />);
    fireEvent.click(screen.getByRole("button", { name: "Show 20 more" }));
    expect(onShowMore).toHaveBeenCalledOnce();
  });

  it("falls back to a plain show more without a step", () => {
    const onShowMore = vi.fn();
    render(<ExpansionIndicator onShowMore={onShowMore} />);
    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(onShowMore).toHaveBeenCalledOnce();
  });

  it("labels the reveal with the count still hidden", () => {
    const onShowMore = vi.fn();
    render(
      <ExpansionIndicator hiddenCount={1} step={20} onShowMore={onShowMore} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show 1 more" }));
    expect(onShowMore).toHaveBeenCalledOnce();
  });

  it("renders show all", () => {
    const onShowAll = vi.fn();
    render(<ExpansionIndicator onShowAll={onShowAll} />);
    fireEvent.click(screen.getByRole("button", { name: /show all/i }));
    expect(onShowAll).toHaveBeenCalledOnce();
  });

  it("separates the parts with dots", () => {
    render(<ExpansionIndicator hiddenCount={42} onShowAll={() => undefined} />);
    expect(screen.getAllByText("•")).toHaveLength(1);
  });

  it("omits absent parts", () => {
    render(<ExpansionIndicator data-testid="expansion" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/hidden/)).toBeNull();
  });

  it("applies the base class", () => {
    render(<ExpansionIndicator data-testid="expansion" />);
    expect(screen.getByTestId("expansion")).toHaveClass(
      "ds",
      "timeline-expansion",
    );
  });
});
