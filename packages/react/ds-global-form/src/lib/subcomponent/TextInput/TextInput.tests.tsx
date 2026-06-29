import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { TextInput } from "./TextInput.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
describe("TextInput (presentational)", () => {
  it("renders an input without a form context", () => {
    render(<TextInput name="username" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("applies the input chrome on the wrapping element", () => {
    render(<TextInput name="username" />);
    expect(screen.getByRole("textbox").parentElement).toHaveClass(
      "ds",
      "input",
      "text",
      "chrome",
    );
  });

  it("renders prefix and suffix", () => {
    render(<TextInput name="domain" prefix="https://" suffix=".com" />);
    expect(screen.getByText("https://")).toBeInTheDocument();
    expect(screen.getByText(".com")).toBeInTheDocument();
  });

  it("maps inputType onto the native type attribute", () => {
    render(<TextInput name="email" inputType="email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("is controllable via value/onChange", () => {
    const onChange = vi.fn();
    render(<TextInput name="t" value="hi" onChange={onChange} />);
    expect(screen.getByRole("textbox")).toHaveValue("hi");
  });

  it("forwards a ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextInput name="t" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("supports the disabled state", () => {
    render(<TextInput name="t" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
