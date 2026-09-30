import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
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

  it("shows the dial code before the ISO code by default", () => {
    render(<PhoneInput defaultCountry="US" />);
    const usOption = Array.from(
      screen.getByLabelText("Country code").querySelectorAll("option"),
    ).find((o) => o.value === "US");
    // Default display = "code": "+1 US" — dial code first, then the ISO code,
    // NOT the full country name.
    expect(usOption?.textContent?.trim()).toBe("+1 US");
    expect(usOption?.textContent).not.toContain("United States");
  });

  it("shows the full country name when countryDisplay='name'", () => {
    render(<PhoneInput countryDisplay="name" defaultCountry="US" />);
    const usOption = Array.from(
      screen.getByLabelText("Country code").querySelectorAll("option"),
    ).find((o) => o.value === "US");
    expect(usOption?.textContent?.trim()).toBe("+1 United States");
  });

  it("hoists preferred countries to the top, in the order given", () => {
    render(<PhoneInput preferredCountries={["GB", "FR"]} />);
    const options = Array.from(
      screen.getByLabelText("Country code").querySelectorAll("option"),
    );
    expect(options[0]?.value).toBe("GB");
    expect(options[1]?.value).toBe("FR");
    // preferred only hoists — the rest of the world is still present.
    expect(options.length).toBeGreaterThan(2);
  });

  it("restricts the list to filteredCountries (whitelist, in order)", () => {
    render(<PhoneInput filteredCountries={["FR", "DE", "ES"]} />);
    const options = Array.from(
      screen.getByLabelText("Country code").querySelectorAll("option"),
    );
    expect(options.map((o) => o.value)).toEqual(["FR", "DE", "ES"]);
  });

  it("composes filteredCountries (universe) with preferredCountries (hoist)", () => {
    render(
      <PhoneInput
        filteredCountries={["FR", "DE", "ES"]}
        preferredCountries={["ES"]}
      />,
    );
    const options = Array.from(
      screen.getByLabelText("Country code").querySelectorAll("option"),
    );
    expect(options[0]?.value).toBe("ES");
    expect(options.map((o) => o.value).sort()).toEqual(["DE", "ES", "FR"]);
  });

  it("renders an emoji flag when countryDisplay='flag'", () => {
    render(<PhoneInput countryDisplay="flag" defaultCountry="US" />);
    const usOption = Array.from(
      screen.getByLabelText("Country code").querySelectorAll("option"),
    ).find((o) => o.value === "US");
    // 🇺🇸 = regional indicators for U+S; the name "United States" must be gone.
    expect(usOption?.textContent).toContain("🇺🇸");
    expect(usOption?.textContent).not.toContain("United States");
  });

  it("leaves a non-ISO-alpha-2 custom code unmapped (no garbage flag)", () => {
    render(
      <PhoneInput
        countryDisplay="flag"
        countries={[{ code: "XYZ", name: "Custom", dialCode: "+999" }]}
        // `defaultCountry` is typed to known codes; cast for this custom-data edge case.
        defaultCountry={"XYZ" as never}
      />,
    );
    const option = screen
      .getByLabelText("Country code")
      .querySelector("option");
    // Non-alpha-2 → returned as-is, not mapped into unrelated code points.
    expect(option?.textContent?.trim()).toBe("+999 XYZ");
  });

  it("shows the number as raw digits by default (mask off)", () => {
    render(<PhoneInput defaultCountry="US" value="+15551234567" />);
    expect(screen.getByLabelText("Phone number")).toHaveValue("5551234567");
  });

  it("formats the number with the country mask when mask is enabled", () => {
    render(<PhoneInput defaultCountry="US" mask value="+15551234567" />);
    // US mask "(###) ###-####"
    expect(screen.getByLabelText("Phone number")).toHaveValue("(555) 123-4567");
  });

  it("still emits raw digits (E.164) even when masked", () => {
    const onChange = vi.fn();
    render(<PhoneInput defaultCountry="US" mask onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "(555) 123-4567" },
    });
    expect(onChange).toHaveBeenLastCalledWith("+15551234567");
  });

  it("names the cause when given an empty country list", () => {
    // Every lookup falls back to the first country, so an empty list has none to
    // render. Failing here beats surfacing later as a missing dial code.
    expect(() => render(<PhoneInput countries={[]} />)).toThrow(
      /non-empty `countries` list/,
    );
  });

  it("satisfies its own pattern for every separator the masks use", () => {
    // New Caledonia's mask is "##.##.##" — the one shipped format using a dot.
    // A pattern derived from the US mask alone would leave a correctly entered
    // number permanently :invalid with no way for the user to satisfy it.
    render(<PhoneInput defaultCountry="NC" mask value="+687123456" />);
    const number = screen.getByLabelText("Phone number") as HTMLInputElement;
    expect(number).toHaveValue("12.34.56");

    // Compiled with the `v` flag, as the HTML parser does, so a pattern that
    // only survives the `u` fallback fails here too.
    const pattern = number.getAttribute("pattern") ?? "";
    expect(new RegExp(`^(?:${pattern})$`, "v").test(number.value)).toBe(true);
  });

  it("forwards a ref to the number input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<PhoneInput defaultCountry="US" ref={ref} />);
    // The number entry is the field's focusable element, so this is the node
    // react-hook-form needs for setFocus and focus-on-error.
    expect(ref.current).toBe(screen.getByLabelText("Phone number"));
  });

  it("carries the native constraints that work without scripting", () => {
    render(<PhoneInput defaultCountry="US" name="mobile" />);
    const number = screen.getByLabelText("Phone number");
    expect(number).toHaveAttribute("name", "mobile");
    expect(number).toHaveAttribute("autocomplete", "tel-national");
    expect(number).toHaveAttribute("inputmode", "tel");
    // A pattern needs a title, or the browser's validation bubble is blank.
    expect(number).toHaveAttribute("pattern");
    expect(number).toHaveAttribute("title");
    expect(screen.getByLabelText("Country code")).toHaveAttribute(
      "autocomplete",
      "tel-country-code",
    );
  });

  it("keeps the caret in place when a masked number is edited in the middle", () => {
    // Controlled by the parent, as PhoneField binds it — this is what makes the
    // value round-trip through a reformat on every keystroke.
    const onChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState<string>("+15551234567");
      return (
        <PhoneInput
          defaultCountry="US"
          mask
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next as string);
          }}
        />
      );
    }
    render(<Controlled />);
    const number = screen.getByLabelText("Phone number") as HTMLInputElement;
    number.focus();
    expect(number).toHaveValue("(555) 123-4567");

    // Type a 9 after "(555".
    fireEvent.change(number, {
      target: { value: "(5559) 123-4567", selectionStart: 5 },
    });

    expect(number).toHaveValue("(555) 912-34567");
    expect(number.selectionStart).toBe(7);
    // The assertion that belongs at this level: the separators the user sees
    // never reach the value the form submits.
    expect(onChange).toHaveBeenLastCalledWith("+155591234567");
  });
});
