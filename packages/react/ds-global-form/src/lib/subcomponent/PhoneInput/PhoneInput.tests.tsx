import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhoneInput } from "./PhoneInput.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
describe("PhoneInput (presentational)", () => {
  it("renders a country select and a tel input without a form context", () => {
    render(<PhoneInput />);
    expect(screen.getByLabelText("Country code")).toBeInTheDocument();
    const number = screen.getByLabelText("Phone number");
    expect(number).toBeInTheDocument();
    expect(number).toHaveAttribute("type", "tel");
  });

  it("applies the input chrome on the wrapping element", () => {
    render(<PhoneInput />);
    expect(screen.getByLabelText("Country code").parentElement).toHaveClass(
      "ds",
      "input",
      "phone",
      "chrome",
    );
  });

  it("defaults to the provided country with an empty number", () => {
    render(<PhoneInput defaultCountry="GB" />);
    expect(screen.getByLabelText("Country code")).toHaveValue("GB");
    expect(screen.getByLabelText("Phone number")).toHaveValue("");
  });

  it("calls onChange with the E.164 formatted value when the number changes", () => {
    const onChange = vi.fn();
    render(<PhoneInput defaultCountry="US" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "5551234" },
    });
    expect(onChange).toHaveBeenCalledWith("+15551234");
  });

  it("calls onChange with a structured value when valueFormat is structured", () => {
    const onChange = vi.fn();
    render(
      <PhoneInput
        defaultCountry="US"
        valueFormat="structured"
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "5551234" },
    });
    expect(onChange).toHaveBeenCalledWith({
      countryCode: "US",
      number: "5551234",
    });
  });

  it("supports the disabled state on both controls", () => {
    render(<PhoneInput disabled />);
    expect(screen.getByLabelText("Country code")).toBeDisabled();
    expect(screen.getByLabelText("Phone number")).toBeDisabled();
  });
});
