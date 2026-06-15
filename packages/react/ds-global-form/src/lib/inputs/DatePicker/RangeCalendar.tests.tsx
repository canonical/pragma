import { CalendarDate } from "@internationalized/date";
import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactElement, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RangeCalendar } from "./RangeCalendar.js";
import type { DateRange, RangeCalendarProps } from "./types.js";

// A fixed in-range month so the rendered grid is deterministic across runs.
const JUNE_2026 = new CalendarDate(2026, 6, 1);

// Controlled wrapper: the presentational RangeCalendar is value/onChange driven,
// so tests drive selection through React state (no react-hook-form, no form).
// `onChange` is forwarded so assertions can inspect the committed range while
// the wrapper keeps `value` in sync (which is what gets highlighted once the
// anchor/preview are cleared on commit).
function ControlledRangeCalendar({
  initialValue = null,
  onChange,
  ...rest
}: Partial<RangeCalendarProps> & {
  initialValue?: DateRange | null;
  onChange?: (v: DateRange) => void;
}): ReactElement {
  const [value, setValue] = useState<DateRange | null>(initialValue);
  return (
    <RangeCalendar
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      focusedValue={JUNE_2026}
      locale="en-US"
      {...rest}
    />
  );
}

/** Address a June 2026 day cell by its full accessible label. */
const cell = (name: string) => screen.getByRole("gridcell", { name });

describe("RangeCalendar (presentational)", () => {
  it("renders a multiselectable grid labelled with the current month", () => {
    render(<ControlledRangeCalendar />);
    const grid = screen.getByRole("grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute("aria-label", "June 2026");
    expect(grid).toHaveAttribute("aria-multiselectable", "true");
    expect(
      screen.getByRole("heading", { name: "June 2026" }),
    ).toBeInTheDocument();
  });

  it("renders 7 weekday column headers", () => {
    render(<ControlledRangeCalendar />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
  });

  it("sets an anchor on the first click without calling onChange", () => {
    const onChange = vi.fn();
    render(<ControlledRangeCalendar onChange={onChange} />);
    fireEvent.click(cell("Wednesday, June 10, 2026"));
    // First click drops the anchor but commits nothing yet.
    expect(onChange).not.toHaveBeenCalled();
    // The anchored day previews as a single-day range (start === end).
    const anchor = cell("Wednesday, June 10, 2026");
    expect(anchor).toHaveAttribute("data-range-start", "true");
    expect(anchor).toHaveAttribute("data-range-end", "true");
    expect(anchor).toHaveAttribute("aria-selected", "true");
  });

  it("commits an ordered range on the second click (earlier → later)", () => {
    const onChange = vi.fn();
    render(<ControlledRangeCalendar onChange={onChange} />);
    fireEvent.click(cell("Wednesday, June 10, 2026"));
    fireEvent.click(cell("Friday, June 19, 2026"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const range = onChange.mock.calls[0][0] as DateRange;
    expect(range.start.day).toBe(10);
    expect(range.end.day).toBe(19);
    expect(range.start.compare(range.end)).toBeLessThanOrEqual(0);
  });

  it("orders the range when clicked later → earlier", () => {
    const onChange = vi.fn();
    render(<ControlledRangeCalendar onChange={onChange} />);
    // Anchor on the later day first, then pick an earlier endpoint.
    fireEvent.click(cell("Friday, June 19, 2026"));
    fireEvent.click(cell("Wednesday, June 10, 2026"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const range = onChange.mock.calls[0][0] as DateRange;
    // Normalized so start <= end regardless of click order.
    expect(range.start.day).toBe(10);
    expect(range.end.day).toBe(19);
    expect(range.start.compare(range.end)).toBeLessThanOrEqual(0);
  });

  it("updates the live preview on hover while anchored", () => {
    render(<ControlledRangeCalendar />);
    fireEvent.click(cell("Wednesday, June 10, 2026"));
    // Hover a later day: the preview should span anchor..hovered, inclusive.
    fireEvent.pointerEnter(cell("Saturday, June 13, 2026"));
    expect(cell("Wednesday, June 10, 2026")).toHaveAttribute(
      "data-range-start",
      "true",
    );
    expect(cell("Saturday, June 13, 2026")).toHaveAttribute(
      "data-range-end",
      "true",
    );
    // An interior day is in-range but is neither endpoint.
    const interior = cell("Friday, June 12, 2026");
    expect(interior).toHaveAttribute("data-in-range", "true");
    expect(interior).toHaveAttribute("aria-selected", "true");
    expect(interior).not.toHaveAttribute("data-range-start");
    expect(interior).not.toHaveAttribute("data-range-end");
  });

  it("highlights start / end / in-range cells for a committed value range", () => {
    render(
      <ControlledRangeCalendar
        initialValue={{
          start: new CalendarDate(2026, 6, 10),
          end: new CalendarDate(2026, 6, 14),
        }}
      />,
    );
    const start = cell("Wednesday, June 10, 2026");
    const end = cell("Sunday, June 14, 2026");
    const interior = cell("Friday, June 12, 2026");
    const outside = cell("Monday, June 15, 2026");

    expect(start).toHaveAttribute("data-range-start", "true");
    expect(start).toHaveAttribute("aria-selected", "true");
    expect(end).toHaveAttribute("data-range-end", "true");
    expect(end).toHaveAttribute("aria-selected", "true");
    expect(interior).toHaveAttribute("data-in-range", "true");
    expect(interior).toHaveAttribute("aria-selected", "true");
    // A day just past the end is not part of the range.
    expect(outside).not.toHaveAttribute("aria-selected");
    expect(outside).not.toHaveAttribute("data-in-range");
  });

  it("selects a range with arrow keys + Enter twice", () => {
    const onChange = vi.fn();
    // Seed the roving focus on June 10 so the focused cell matches the internal
    // focusedDate; .focus() moves DOM focus but does not sync React state.
    render(
      <ControlledRangeCalendar
        onChange={onChange}
        focusedValue={new CalendarDate(2026, 6, 10)}
      />,
    );
    const grid = screen.getByRole("grid");
    // Focus the anchor day, then anchor it with Enter.
    cell("Wednesday, June 10, 2026").focus();
    fireEvent.keyDown(grid, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    // Navigate three days forward; the preview tracks the focused date.
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    expect(cell("Saturday, June 13, 2026")).toHaveAttribute(
      "data-range-end",
      "true",
    );
    // Commit with a second Enter.
    fireEvent.keyDown(grid, { key: "Enter" });
    expect(onChange).toHaveBeenCalledTimes(1);
    const range = onChange.mock.calls[0][0] as DateRange;
    expect(range.start.day).toBe(10);
    expect(range.end.day).toBe(13);
  });

  it("does not anchor on a disabled (out-of-range) day", () => {
    const onChange = vi.fn();
    render(
      <ControlledRangeCalendar
        onChange={onChange}
        minValue={new CalendarDate(2026, 6, 10)}
      />,
    );
    const disabled = cell("Tuesday, June 9, 2026");
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(disabled);
    // No anchor was set: it does not preview as a range start.
    expect(disabled).not.toHaveAttribute("data-range-start");
    // A subsequent click therefore starts a fresh anchor, still no onChange.
    fireEvent.click(cell("Friday, June 12, 2026"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cancels an in-progress selection on Escape", () => {
    const onChange = vi.fn();
    render(<ControlledRangeCalendar onChange={onChange} />);
    const grid = screen.getByRole("grid");
    fireEvent.click(cell("Wednesday, June 10, 2026"));
    expect(cell("Wednesday, June 10, 2026")).toHaveAttribute(
      "data-range-start",
      "true",
    );
    fireEvent.keyDown(grid, { key: "Escape" });
    // Preview cleared, nothing committed.
    expect(cell("Wednesday, June 10, 2026")).not.toHaveAttribute(
      "data-range-start",
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("changes the displayed month with the next / prev buttons", () => {
    render(<ControlledRangeCalendar />);
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("grid")).toHaveAttribute("aria-label", "July 2026");
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("grid")).toHaveAttribute("aria-label", "May 2026");
  });
});
