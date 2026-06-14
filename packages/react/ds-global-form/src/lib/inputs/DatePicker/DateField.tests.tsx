import { CalendarDate } from "@internationalized/date";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DateField } from "./DateField.js";

// A controlled wrapper so the field round-trips its onChange through `value`,
// mirroring real usage. The spy observes every emitted value.
function ControlledDateField({
  onChange,
  initial = null,
  ...rest
}: {
  onChange: (v: CalendarDate | null) => void;
  initial?: CalendarDate | null;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  isDisabled?: boolean;
}) {
  const [value, setValue] = useState<CalendarDate | null>(initial);
  return (
    <DateField
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("DateField (presentational)", () => {
  it("renders three spinbutton segments", () => {
    render(<DateField value={null} onChange={() => {}} />);
    const spinbuttons = screen.getAllByRole("spinbutton");
    expect(spinbuttons).toHaveLength(3);
    expect(screen.getByRole("group")).toBeInTheDocument();
    // Default en-US order: Month, Day, Year.
    expect(spinbuttons[0]).toHaveAttribute("aria-label", "Month");
    expect(spinbuttons[1]).toHaveAttribute("aria-label", "Day");
    expect(spinbuttons[2]).toHaveAttribute("aria-label", "Year");
  });

  it("shows placeholders when value is null", () => {
    render(<DateField value={null} onChange={() => {}} locale="en-US" />);
    expect(screen.getByLabelText("Month")).toHaveTextContent("mm");
    expect(screen.getByLabelText("Day")).toHaveTextContent("dd");
    expect(screen.getByLabelText("Year")).toHaveTextContent("yyyy");
    // Placeholder segments omit aria-valuenow.
    expect(screen.getByLabelText("Month")).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByLabelText("Month")).toHaveAttribute(
      "data-placeholder",
      "true",
    );
  });

  it("renders the controlled value zero-padded", () => {
    render(
      <DateField
        value={new CalendarDate(2024, 3, 5)}
        onChange={() => {}}
        locale="en-US"
      />,
    );
    expect(screen.getByLabelText("Month")).toHaveTextContent("03");
    expect(screen.getByLabelText("Day")).toHaveTextContent("05");
    expect(screen.getByLabelText("Year")).toHaveTextContent("2024");
    expect(screen.getByLabelText("Month")).toHaveAttribute(
      "aria-valuenow",
      "3",
    );
    // Month announces its localized name.
    expect(screen.getByLabelText("Month")).toHaveAttribute(
      "aria-valuetext",
      "March",
    );
  });

  it("ArrowUp on the month segment increments and announces it", () => {
    const onChange = vi.fn();
    render(
      <ControlledDateField
        onChange={onChange}
        initial={new CalendarDate(2024, 3, 5)}
      />,
    );
    const month = screen.getByLabelText("Month");
    fireEvent.keyDown(month, { key: "ArrowUp" });
    expect(month).toHaveAttribute("aria-valuenow", "4");
    expect(month).toHaveTextContent("04");
    expect(month).toHaveAttribute("aria-valuetext", "April");
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2024, 4, 5));
  });

  it("ArrowUp wraps the month segment within its range (no full date)", () => {
    render(<DateField value={null} onChange={() => {}} />);
    const month = screen.getByLabelText("Month");
    // First press starts at the minimum (1).
    fireEvent.keyDown(month, { key: "ArrowUp" });
    expect(month).toHaveAttribute("aria-valuenow", "1");
    // ArrowDown from 1 wraps to 12.
    fireEvent.keyDown(month, { key: "ArrowDown" });
    expect(month).toHaveAttribute("aria-valuenow", "12");
  });

  it("typing '12' into month auto-advances focus to day", () => {
    render(<DateField value={null} onChange={() => {}} />);
    const month = screen.getByLabelText("Month");
    const day = screen.getByLabelText("Day");
    month.focus();
    fireEvent.keyDown(month, { key: "1" });
    expect(month).toHaveTextContent("01");
    // Month still focused after one digit.
    expect(document.activeElement).toBe(month);
    fireEvent.keyDown(month, { key: "2" });
    expect(month).toHaveTextContent("12");
    // Two digits fills the month → focus moves to the day segment.
    expect(document.activeElement).toBe(day);
  });

  it("auto-advances early when a second digit would overflow", () => {
    render(<DateField value={null} onChange={() => {}} />);
    const month = screen.getByLabelText("Month");
    const day = screen.getByLabelText("Day");
    month.focus();
    // Typing "2" for the month: any second digit (20+) exceeds 12, so advance.
    fireEvent.keyDown(month, { key: "2" });
    expect(month).toHaveTextContent("02");
    expect(document.activeElement).toBe(day);
  });

  it("entering a full date calls onChange with a CalendarDate", () => {
    const onChange = vi.fn();
    render(<ControlledDateField onChange={onChange} />);
    const month = screen.getByLabelText("Month");
    const day = screen.getByLabelText("Day");
    const year = screen.getByLabelText("Year");

    month.focus();
    fireEvent.keyDown(month, { key: "0" });
    fireEvent.keyDown(month, { key: "6" });
    day.focus();
    fireEvent.keyDown(day, { key: "1" });
    fireEvent.keyDown(day, { key: "4" });
    year.focus();
    fireEvent.keyDown(year, { key: "2" });
    fireEvent.keyDown(year, { key: "0" });
    fireEvent.keyDown(year, { key: "2" });
    fireEvent.keyDown(year, { key: "4" });

    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2024, 6, 14));
  });

  it("ArrowLeft / ArrowRight move focus between segments", () => {
    render(<DateField value={null} onChange={() => {}} />);
    const month = screen.getByLabelText("Month");
    const day = screen.getByLabelText("Day");
    month.focus();
    fireEvent.keyDown(month, { key: "ArrowRight" });
    expect(document.activeElement).toBe(day);
    fireEvent.keyDown(day, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(month);
  });

  it("Home / End focus the first / last segment", () => {
    render(<DateField value={null} onChange={() => {}} />);
    const month = screen.getByLabelText("Month");
    const year = screen.getByLabelText("Year");
    const day = screen.getByLabelText("Day");
    day.focus();
    fireEvent.keyDown(day, { key: "End" });
    expect(document.activeElement).toBe(year);
    fireEvent.keyDown(year, { key: "Home" });
    expect(document.activeElement).toBe(month);
  });

  it("Backspace clears a filled segment then emits null", () => {
    const onChange = vi.fn();
    render(
      <ControlledDateField
        onChange={onChange}
        initial={new CalendarDate(2024, 6, 14)}
      />,
    );
    const day = screen.getByLabelText("Day");
    fireEvent.keyDown(day, { key: "Backspace" });
    expect(day).toHaveTextContent("dd");
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("Backspace on an empty segment moves focus to the previous one", () => {
    render(<DateField value={null} onChange={() => {}} />);
    const month = screen.getByLabelText("Month");
    const day = screen.getByLabelText("Day");
    day.focus();
    fireEvent.keyDown(day, { key: "Backspace" });
    expect(document.activeElement).toBe(month);
  });

  it("clamps the day to the month length", () => {
    const onChange = vi.fn();
    render(<ControlledDateField onChange={onChange} />);
    const month = screen.getByLabelText("Month");
    const day = screen.getByLabelText("Day");
    const year = screen.getByLabelText("Year");
    // February 2023 (non-leap) has 28 days; typing "30" must clamp to 28.
    month.focus();
    fireEvent.keyDown(month, { key: "0" });
    fireEvent.keyDown(month, { key: "2" });
    year.focus();
    fireEvent.keyDown(year, { key: "2" });
    fireEvent.keyDown(year, { key: "0" });
    fireEvent.keyDown(year, { key: "2" });
    fireEvent.keyDown(year, { key: "3" });
    day.focus();
    fireEvent.keyDown(day, { key: "3" });
    fireEvent.keyDown(day, { key: "0" });
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2023, 2, 28));
  });

  it("clamps a complete date to minValue", () => {
    const onChange = vi.fn();
    const min = new CalendarDate(2024, 1, 1);
    render(<ControlledDateField onChange={onChange} minValue={min} />);
    const month = screen.getByLabelText("Month");
    const day = screen.getByLabelText("Day");
    const year = screen.getByLabelText("Year");
    // Enter 2020-06-15, which is below the 2024-01-01 minimum.
    month.focus();
    fireEvent.keyDown(month, { key: "0" });
    fireEvent.keyDown(month, { key: "6" });
    day.focus();
    fireEvent.keyDown(day, { key: "1" });
    fireEvent.keyDown(day, { key: "5" });
    year.focus();
    fireEvent.keyDown(year, { key: "2" });
    fireEvent.keyDown(year, { key: "0" });
    fireEvent.keyDown(year, { key: "2" });
    fireEvent.keyDown(year, { key: "0" });
    expect(onChange).toHaveBeenLastCalledWith(min);
  });

  it("fires onBlur when focus leaves the group", () => {
    const onBlur = vi.fn();
    render(
      <>
        <DateField value={null} onChange={() => {}} onBlur={onBlur} />
        <button type="button">outside</button>
      </>,
    );
    const month = screen.getByLabelText("Month");
    const outside = screen.getByRole("button", { name: "outside" });
    month.focus();
    fireEvent.blur(month, { relatedTarget: outside });
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("disabled segments have tabIndex -1 and aria-disabled", () => {
    render(<DateField value={null} onChange={() => {}} isDisabled />);
    for (const seg of screen.getAllByRole("spinbutton")) {
      expect(seg).toHaveAttribute("tabindex", "-1");
      expect(seg).toHaveAttribute("aria-disabled", "true");
    }
    expect(screen.getByRole("group")).toHaveAttribute("aria-disabled", "true");
  });

  it("ignores keyboard input when disabled", () => {
    const onChange = vi.fn();
    render(
      <DateField value={null} onChange={onChange} isDisabled locale="en-US" />,
    );
    const month = screen.getByLabelText("Month");
    fireEvent.keyDown(month, { key: "ArrowUp" });
    fireEvent.keyDown(month, { key: "5" });
    expect(month).toHaveTextContent("mm");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders segments in the locale order (en-GB → day first)", () => {
    render(<DateField value={null} onChange={() => {}} locale="en-GB" />);
    const spinbuttons = screen.getAllByRole("spinbutton");
    // en-GB formats day/month/year.
    expect(spinbuttons[0]).toHaveAttribute("aria-label", "Day");
    expect(spinbuttons[1]).toHaveAttribute("aria-label", "Month");
    expect(spinbuttons[2]).toHaveAttribute("aria-label", "Year");
  });
});
