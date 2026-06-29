import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { CheckboxInput } from "./CheckboxInput.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
describe("CheckboxInput (presentational)", () => {
  it("renders a checkbox without a form context", () => {
    render(<CheckboxInput name="agree" />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("applies the component class", () => {
    render(<CheckboxInput name="agree" />);
    expect(screen.getByRole("checkbox")).toHaveClass("form-checkbox");
  });

  it("is controllable via checked/onChange", () => {
    const onChange = vi.fn();
    render(<CheckboxInput name="agree" checked onChange={onChange} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("forwards a ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<CheckboxInput name="agree" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("supports the disabled state", () => {
    render(<CheckboxInput name="agree" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
