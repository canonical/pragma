import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { DateInput } from "./DateInput.js";
import { DateTimeInput } from "./DateTimeInput.js";
import { TimeInput } from "./TimeInput.js";

// These tests render the presentational inputs with NO FormProvider, proving
// they are usable standalone (outside of a <Form>).
describe("DateInput (presentational)", () => {
  it("renders an input with type=date without a form context", () => {
    render(<DateInput name="birthday" />);
    const input = screen.getByDisplayValue("");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "date");
  });

  it("applies the input chrome", () => {
    render(<DateInput name="birthday" />);
    expect(screen.getByDisplayValue("")).toHaveClass(
      "ds",
      "input",
      "date",
      "chrome",
    );
  });

  it("forwards min and max onto the native input", () => {
    render(<DateInput name="birthday" min="2024-01-01" max="2025-12-31" />);
    const input = screen.getByDisplayValue("");
    expect(input).toHaveAttribute("min", "2024-01-01");
    expect(input).toHaveAttribute("max", "2025-12-31");
  });

  it("is controllable via value/onChange", () => {
    const onChange = vi.fn();
    render(<DateInput name="d" value="2024-06-14" onChange={onChange} />);
    expect(screen.getByDisplayValue("2024-06-14")).toBeInTheDocument();
  });

  it("forwards a ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<DateInput name="d" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("supports the disabled state", () => {
    render(<DateInput name="d" disabled />);
    expect(screen.getByDisplayValue("")).toBeDisabled();
  });
});

describe("TimeInput (presentational)", () => {
  it("renders an input with type=time and forwards step", () => {
    render(<TimeInput name="meeting_time" step={900} />);
    const input = screen.getByDisplayValue("");
    expect(input).toHaveAttribute("type", "time");
    expect(input).toHaveAttribute("step", "900");
  });

  it("forwards a ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TimeInput name="t" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

describe("DateTimeInput (presentational)", () => {
  it("renders an input with type=datetime-local", () => {
    render(<DateTimeInput name="event_datetime" />);
    expect(screen.getByDisplayValue("")).toHaveAttribute(
      "type",
      "datetime-local",
    );
  });

  it("forwards a ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<DateTimeInput name="dt" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
