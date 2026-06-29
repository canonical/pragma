import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { TextareaInput } from "./TextareaInput.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
describe("TextareaInput (presentational)", () => {
  it("renders a textarea without a form context", () => {
    render(<TextareaInput name="content" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("applies chrome and component classes", () => {
    render(<TextareaInput name="content" />);
    expect(screen.getByRole("textbox")).toHaveClass(
      "ds",
      "input",
      "textarea",
      "chrome",
    );
  });

  it("is controllable via value/onChange", () => {
    const onChange = vi.fn();
    render(<TextareaInput name="content" value="hi" onChange={onChange} />);
    expect(screen.getByRole("textbox")).toHaveValue("hi");
  });

  it("forwards a ref to the underlying textarea", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<TextareaInput name="content" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("supports the disabled state", () => {
    render(<TextareaInput name="content" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
