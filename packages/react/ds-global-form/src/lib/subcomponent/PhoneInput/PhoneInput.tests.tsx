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

  it("sorts the country options by ascending dial code", () => {
    render(<PhoneInput />);
    const options = Array.from(
      screen.getByLabelText("Country code").querySelectorAll("option"),
    );
    const dialValues = options.map((o) =>
      Number.parseInt((o.textContent ?? "").replace(/\D/g, ""), 10),
    );
    const sorted = [...dialValues].sort((a, b) => a - b);
    expect(dialValues).toEqual(sorted);
  });

  it("shows the dial code before the country name", () => {
    render(<PhoneInput />);
    const option = screen
      .getByLabelText("Country code")
      .querySelector("option");
    // e.g. "+1 Canada" — dial code first, then the name.
    expect(option?.textContent?.trim()).toMatch(/^\+\d+\s+\S/);
  });

  it("keeps preferred countries first, in the order given", () => {
    render(<PhoneInput preferredCountries={["GB", "FR"]} />);
    const options = Array.from(
      screen.getByLabelText("Country code").querySelectorAll("option"),
    );
    expect(options[0]?.value).toBe("GB");
    expect(options[1]?.value).toBe("FR");
  });

  it("renders an emoji flag instead of the name when countryDisplay='flag'", () => {
    render(<PhoneInput countryDisplay="flag" defaultCountry="US" />);
    const usOption = Array.from(
      screen.getByLabelText("Country code").querySelectorAll("option"),
    ).find((o) => o.value === "US");
    // 🇺🇸 = regional indicators for U+S; the name "United States" must be gone.
    expect(usOption?.textContent).toContain("🇺🇸");
    expect(usOption?.textContent).not.toContain("United States");
  });
});
