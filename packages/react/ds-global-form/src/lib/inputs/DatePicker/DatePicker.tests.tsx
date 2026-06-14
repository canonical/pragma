import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DatePicker } from "./DatePicker.js";
import type { DatePickerPresentationProps } from "./types.js";

function Controlled({
  initial = "",
  ...props
}: { initial?: string } & Partial<DatePickerPresentationProps>) {
  const [value, setValue] = useState(initial);
  return <DatePicker {...props} value={value} onChange={setValue} />;
}

describe("DatePicker (presentational)", () => {
  it("renders a date field group and a calendar toggle without a form", () => {
    render(<Controlled />);
    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /calendar/i }),
    ).toBeInTheDocument();
  });

  it("opens the calendar on toggle", () => {
    render(<Controlled />);
    const toggle = screen.getByRole("button", { name: /calendar/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // The calendar lives in a `popover` element (jsdom treats it as hidden).
    expect(screen.getByRole("grid", { hidden: true })).toBeInTheDocument();
  });

  it("reflects an ISO value in the segmented field", () => {
    render(<Controlled initial="2026-06-14" />);
    expect(screen.getByRole("group")).toHaveTextContent("2026");
  });

  it("can be disabled", () => {
    render(<Controlled isDisabled />);
    expect(screen.getByRole("button", { name: /calendar/i })).toBeDisabled();
  });
});
