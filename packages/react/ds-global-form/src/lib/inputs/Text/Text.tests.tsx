import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Text } from "./Text.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
describe("Text (presentational)", () => {
  it("renders an input without a form context", () => {
    render(<Text name="username" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("applies the input chrome on the wrapping element", () => {
    render(<Text name="username" />);
    expect(screen.getByRole("textbox").parentElement).toHaveClass(
      "ds",
      "input",
      "text",
      "chrome",
    );
  });

  it("renders prefix and suffix", () => {
    render(<Text name="domain" prefix="https://" suffix=".com" />);
    expect(screen.getByText("https://")).toBeInTheDocument();
    expect(screen.getByText(".com")).toBeInTheDocument();
  });

  it("maps inputType onto the native type attribute", () => {
    render(<Text name="email" inputType="email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("is controllable via value/onChange", () => {
    const onChange = vi.fn();
    render(<Text name="t" value="hi" onChange={onChange} />);
    expect(screen.getByRole("textbox")).toHaveValue("hi");
  });

  it("forwards a ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Text name="t" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("supports the disabled state", () => {
    render(<Text name="t" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
