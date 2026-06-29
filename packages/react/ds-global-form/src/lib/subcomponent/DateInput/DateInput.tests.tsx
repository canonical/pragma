import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { DateInput } from "./DateInput.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
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
