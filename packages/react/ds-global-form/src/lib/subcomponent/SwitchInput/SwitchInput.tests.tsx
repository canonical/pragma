import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { SwitchInput } from "./SwitchInput.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
describe("SwitchInput (presentational)", () => {
  it("renders a switch without a form context", () => {
    render(<SwitchInput name="notify" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("renders as a checkbox input under the hood", () => {
    render(<SwitchInput name="notify" />);
    expect(screen.getByRole("switch")).toHaveAttribute("type", "checkbox");
  });

  it("applies the component class", () => {
    render(<SwitchInput name="notify" />);
    expect(screen.getByRole("switch")).toHaveClass("form-switch");
  });

  it("is controllable via checked/onChange", () => {
    const onChange = vi.fn();
    render(<SwitchInput name="notify" checked onChange={onChange} />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("forwards a ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<SwitchInput name="notify" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("supports the disabled state", () => {
    render(<SwitchInput name="notify" disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
