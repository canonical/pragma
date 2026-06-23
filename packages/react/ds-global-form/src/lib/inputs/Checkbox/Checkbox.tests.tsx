import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
describe("Checkbox (presentational)", () => {
  it("renders a checkbox without a form context", () => {
    render(<Checkbox name="agree" />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("applies the component class", () => {
    render(<Checkbox name="agree" />);
    expect(screen.getByRole("checkbox")).toHaveClass("form-checkbox");
  });

  it("is controllable via checked/onChange", () => {
    const onChange = vi.fn();
    render(<Checkbox name="agree" checked onChange={onChange} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("forwards a ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox name="agree" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("supports the disabled state", () => {
    render(<Checkbox name="agree" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
