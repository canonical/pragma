import { CalendarDate } from "@internationalized/date";
import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactElement, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "./Calendar.js";
import type { CalendarProps } from "./types.js";

// A fixed in-range date so the rendered month is deterministic across runs.
const JUNE_15 = new CalendarDate(2026, 6, 15);

// Controlled wrapper: the presentational Calendar is value/onChange driven, so
// tests drive selection through React state (no react-hook-form, no form).
function ControlledCalendar({
  initialValue = JUNE_15,
  onChange,
  ...rest
}: Partial<CalendarProps> & {
  initialValue?: CalendarDate | null;
  onChange?: (v: CalendarDate) => void;
}): ReactElement {
  const [value, setValue] = useState<CalendarDate | null>(initialValue);
  return (
    <Calendar
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      locale="en-US"
      {...rest}
    />
  );
}

describe("Calendar (presentational)", () => {
  it("renders a grid labelled with the current month", () => {
    render(<ControlledCalendar />);
    const grid = screen.getByRole("grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute("aria-label", "June 2026");
    expect(
      screen.getByRole("heading", { name: "June 2026" }),
    ).toBeInTheDocument();
  });

  it("renders 7 weekday column headers", () => {
    render(<ControlledCalendar />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
  });

  it("calls onChange with the clicked CalendarDate", () => {
    const onChange = vi.fn();
    render(<ControlledCalendar onChange={onChange} />);
    // The 20th of June, addressed by its full accessible label.
    fireEvent.click(
      screen.getByRole("gridcell", { name: "Saturday, June 20, 2026" }),
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as CalendarDate;
    expect(arg.year).toBe(2026);
    expect(arg.month).toBe(6);
    expect(arg.day).toBe(20);
  });

  it("marks the selected day with aria-selected", () => {
    render(<ControlledCalendar />);
    const selected = screen.getByRole("gridcell", {
      name: "Monday, June 15, 2026",
    });
    expect(selected).toHaveAttribute("aria-selected", "true");
    // A non-selected day must not carry the attribute.
    expect(
      screen.getByRole("gridcell", { name: "Tuesday, June 16, 2026" }),
    ).not.toHaveAttribute("aria-selected");
  });

  it("moves focus to the next day on ArrowRight (roving tabindex)", () => {
    render(<ControlledCalendar />);
    const day15 = screen.getByRole("gridcell", {
      name: "Monday, June 15, 2026",
    });
    // Initially only the focused date is tabbable.
    expect(day15).toHaveAttribute("tabindex", "0");
    day15.focus();
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowRight" });

    const day16 = screen.getByRole("gridcell", {
      name: "Tuesday, June 16, 2026",
    });
    expect(day16).toHaveAttribute("tabindex", "0");
    expect(day15).toHaveAttribute("tabindex", "-1");
  });

  it("moves focus a week down on ArrowDown", () => {
    render(<ControlledCalendar />);
    screen.getByRole("gridcell", { name: "Monday, June 15, 2026" }).focus();
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowDown" });
    expect(
      screen.getByRole("gridcell", { name: "Monday, June 22, 2026" }),
    ).toHaveAttribute("tabindex", "0");
  });

  it("selects the focused date on Enter", () => {
    const onChange = vi.fn();
    render(<ControlledCalendar onChange={onChange} />);
    const grid = screen.getByRole("grid");
    screen.getByRole("gridcell", { name: "Monday, June 15, 2026" }).focus();
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    fireEvent.keyDown(grid, { key: "Enter" });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0][0] as CalendarDate).day).toBe(16);
  });

  it("changes the displayed month with the next/prev buttons", () => {
    render(<ControlledCalendar />);
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("grid")).toHaveAttribute("aria-label", "July 2026");

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("grid")).toHaveAttribute("aria-label", "May 2026");
  });

  it("follows an externally-changed value into view", () => {
    function Harness(): ReactElement {
      const [value, setValue] = useState<CalendarDate | null>(JUNE_15);
      return (
        <>
          <button
            type="button"
            onClick={() => setValue(new CalendarDate(2026, 9, 3))}
          >
            jump
          </button>
          <Calendar value={value} onChange={setValue} locale="en-US" />
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole("grid")).toHaveAttribute("aria-label", "June 2026");
    fireEvent.click(screen.getByRole("button", { name: "jump" }));
    // The grid follows the new value's month.
    expect(screen.getByRole("grid")).toHaveAttribute(
      "aria-label",
      "September 2026",
    );
    expect(
      screen.getByRole("gridcell", { name: "Thursday, September 3, 2026" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("disables out-of-range days via min/max", () => {
    render(
      <ControlledCalendar
        minValue={new CalendarDate(2026, 6, 10)}
        maxValue={new CalendarDate(2026, 6, 20)}
      />,
    );
    // Before min and after max are disabled…
    expect(
      screen.getByRole("gridcell", { name: "Tuesday, June 9, 2026" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("gridcell", { name: "Sunday, June 21, 2026" }),
    ).toHaveAttribute("aria-disabled", "true");
    // …in-range is enabled.
    expect(
      screen.getByRole("gridcell", { name: "Wednesday, June 10, 2026" }),
    ).not.toHaveAttribute("aria-disabled");
  });

  it("does not call onChange when clicking a disabled day", () => {
    const onChange = vi.fn();
    render(
      <ControlledCalendar
        onChange={onChange}
        minValue={new CalendarDate(2026, 6, 10)}
      />,
    );
    fireEvent.click(
      screen.getByRole("gridcell", { name: "Tuesday, June 9, 2026" }),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks unavailable days as disabled without selecting them", () => {
    const onChange = vi.fn();
    render(
      <ControlledCalendar
        onChange={onChange}
        // The 18th is unavailable (e.g. a holiday).
        isDateUnavailable={(d) => d.day === 18}
      />,
    );
    const cell = screen.getByRole("gridcell", {
      name: "Thursday, June 18, 2026",
    });
    expect(cell).toHaveAttribute("aria-disabled", "true");
    expect(cell).toHaveAttribute("data-unavailable", "true");
    fireEvent.click(cell);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks today with aria-current", () => {
    // No fixed value — focusedValue drives the visible month; today is whatever
    // the run date is, so assert against exactly one aria-current cell.
    render(<Calendar value={null} onChange={vi.fn()} locale="en-US" />);
    const current = screen
      .getAllByRole("gridcell")
      .filter((c) => c.getAttribute("aria-current") === "date");
    expect(current).toHaveLength(1);
  });

  it("disables prev navigation when the previous month is fully before min", () => {
    render(<ControlledCalendar minValue={new CalendarDate(2026, 6, 1)} />);
    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Next month" }),
    ).not.toBeDisabled();
  });
});
