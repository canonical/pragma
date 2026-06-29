import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColorInput } from "./ColorInput.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
describe("ColorInput (presentational)", () => {
  it("renders the trigger button without a form context", () => {
    render(<ColorInput value="#ff0000" />);
    expect(screen.getByRole("button", { name: "#ff0000" })).toBeInTheDocument();
  });

  it("applies the input chrome on the wrapping element", () => {
    const { container } = render(<ColorInput value="#ff0000" />);
    expect(container.querySelector(".ds.input.color")).toBeInTheDocument();
  });

  it("reflects the controlled value in the trigger", () => {
    render(<ColorInput value="#3b82f6" />);
    expect(screen.getByText("#3b82f6")).toBeInTheDocument();
  });

  it("defaults to #000000 when value is not a string", () => {
    render(<ColorInput />);
    expect(screen.getByText("#000000")).toBeInTheDocument();
  });

  it("calls onChange with the hex when a swatch is clicked", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorInput value="#000000" swatches={["#ef4444"]} onChange={onChange} />,
    );
    // Swatches live inside popover="manual"; jsdom does not implement the
    // Popover API, so the swatch never enters the a11y tree. Query it from the
    // DOM directly and click it.
    const swatch = container.querySelector(".swatch");
    expect(swatch).not.toBeNull();
    fireEvent.click(swatch as Element);
    expect(onChange).toHaveBeenCalledWith("#ef4444");
  });

  it("renders the hex input row", () => {
    render(<ColorInput value="#000000" />);
    expect(screen.getByLabelText("Hex color value")).toBeInTheDocument();
  });

  it("calls onChange when a valid hex is typed", () => {
    const onChange = vi.fn();
    render(<ColorInput value="#000000" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Hex color value"), {
      target: { value: "abcdef" },
    });
    expect(onChange).toHaveBeenCalledWith("#abcdef");
  });

  it("renders an inline hex input when there are no swatches", () => {
    const { container } = render(<ColorInput value="#000000" swatches={[]} />);
    expect(
      container.querySelector(".ds.input.color.inline"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Hex color value")).toBeInTheDocument();
  });

  it("supports the disabled state", () => {
    render(<ColorInput value="#000000" disabled />);
    expect(screen.getByRole("button", { name: "#000000" })).toBeDisabled();
    expect(screen.getByLabelText("Hex color value")).toBeDisabled();
  });

  it("does not call onChange from a swatch when disabled", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorInput
        value="#000000"
        swatches={["#ef4444"]}
        onChange={onChange}
        disabled
      />,
    );
    // The disabled trigger cannot open the popover, so query the swatch from the
    // DOM directly; clicking the disabled swatch must not fire onChange.
    const swatch = container.querySelector(".swatch");
    expect(swatch).not.toBeNull();
    fireEvent.click(swatch as Element);
    expect(onChange).not.toHaveBeenCalled();
  });
});
